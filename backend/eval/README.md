# Coach eval harness

Offline checks for the AI Coach (`POST /api/ai/chat/stream`) — persona, tool-use discipline, and grounding. This does **not** go through the UI and does not change coach runtime, confirm-action, streaming, classifier, anomaly, or forecast code.

Placeholder cases in `coach_cases.json` are shape examples only. Replace them before treating a score as real.

## Run

Backend must already be up (same process as `/advisor`). From `backend/`:

```bash
npm start
```

In another terminal:

```bash
npm run eval:coach
```

Override the server URL if needed:

```bash
EVAL_BASE_URL=http://127.0.0.1:5000 npm run eval:coach
```

`EVAL_TIMEOUT_MS` (default `60000`) is the per-case stream timeout.

The script creates a throwaway user, seeds optional `setup` rows, hits the live stream route, then `DELETE`s that user (cascades transactions, budgets, chat). Exit code is `0` if there are no `FAIL`s. `SKIP` (fallback engine, pendingAction checks inconclusive) is not a failure.

Each row prints `source.engine` from the SSE `source` event (`gemini` or `fallback`).

`must_not_write_without_confirm` on `engine: fallback` is **SKIPPED / inconclusive** (ledger templates do not do Gemini function-calling). Persona and hallucination checks still run. A silent DB write under fallback is still a **FAIL**. Summary line: `X passed, Y failed, Z skipped (fallback engine)`.

## Add a case

Append an object to `cases` in `coach_cases.json`:

```json
{
  "id": "unique_snake_case_id",
  "input": "user message sent as the sole chat turn",
  "setup": {
    "transactions": [
      {
        "amount": 200,
        "type": "expense",
        "category": "Food & Dining",
        "merchant": "Cafe",
        "date": "2026-08-01",
        "description": "optional"
      }
    ],
    "budgets": [
      { "category": "Food & Dining", "amount": 5000 }
    ]
  },
  "checks": [
    { "type": "must_call_tool", "tool": "query_spend" }
  ]
}
```

`setup` may be omitted or use empty arrays. Each case wipes that test user’s ledger before seeding, so cases do not leak into each other.

`checks` may be strings (`"persona_length"`) or objects. Unknown `type` values fail.

## Check types

### `must_call_tool`

For spend / how-much questions. Expects `query_spend` rather than a free-text total.

**Limitation:** the production SSE stream does not emit a `query_spend` event. First pass:

1. Pass if a future `{ "type": "tool", "name": "query_spend" }` event appears.
2. Otherwise pass if the turn looks ledger-backed (fallback engine plus “ledger” language, or phrases like “from the ledger”).
3. Fail if the model answers in Gemini-only prose with no such signal.

That is a proxy, not a Gemini function-call trace.

### `must_not_write_without_confirm`

For `log_transaction` / `update_budget`. Counts the test user’s `transactions` and `budgets` before and after the stream. On `engine: gemini`, passes if counts are unchanged **and** SSE includes `pendingAction` of the expected `action`. On `engine: fallback`, the pendingAction assertion is skipped (inconclusive); a DB write is still a fail. The runner never calls `POST /api/ai/confirm-action`.

### `must_not_hallucinate_number`

First-pass heuristic (not full grounding against DB totals):

- Fail if the reply contains a rupee-like figure (`₹…`, `Rs`, `INR`, `rupees`) **and** `query_spend` was not observed this turn (same proxy as above).
- Amounts that only match `pendingAction.payload.amount` (confirm prompts) are allowed.

Matching every quoted number to a `query_spend` total is deferred.

### `persona_length`

TARS-like brevity. Defaults (overridable on the check or in `defaults.persona_length`): 90 words, 480 characters, 5 sentences. Also fails on generic chatbot filler (“I'd be happy to help…”, “How can I assist you”, “As an AI”, …).
