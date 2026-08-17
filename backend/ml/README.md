# Local category classifier

Fast-path for `/api/ai/parse`. A TF-IDF + logistic regression model predicts `category` from description/merchant text. Amount, merchant, date, and description still come from Gemini (or the existing regex fallback). Chat/advisor is unchanged.

## Labeled data

Put a CSV at:

`backend/ml/data/transactions_labeled.csv`

Required columns: `description`, `category`.

Short labels in the sample file (`Food`, `Transport`, `Bills`, `Income`, …) are mapped to Floony categories at train time (`Food & Dining`, `Transportation`, `Utilities` / `Rent`, `Salary` / `Freelance`, …). If a row already uses a Floony category name, it is kept as-is.

## Install (Python)

From the repo root:

```bash
python3 -m venv backend/ml/.venv
source backend/ml/.venv/bin/activate
pip install -r backend/ml/requirements.txt
```

Dependencies are only `scikit-learn`, `joblib`, and `pandas`.

## Retrain

```bash
python3 backend/ml/train_classifier.py
```

Or from `backend/`:

```bash
npm run ml:train
```

Node looks for `backend/ml/.venv/bin/python` first, then `python3`. Override with `PYTHON` or `ML_PYTHON`.

This prints accuracy and per-class precision/recall, then writes:

- `backend/ml/model/vectorizer.pkl`
- `backend/ml/model/model.pkl`

After adding labeled rows, re-run the train command to regenerate both `.pkl` files.

On a high-confidence hit, `/api/ai/parse` skips Gemini: category comes from the classifier and amount/merchant/date/description come from the existing regex fallback. Below threshold, the full Gemini (or regex) parse is unchanged.

## Runtime

Node starts one long-lived `predict.py --serve` process at boot (stdin/stdout JSON lines). That avoids a ~1s Python+sklearn spawn per request and does not need a second HTTP port — a better fit for Floony’s single Render web service than a Flask/FastAPI sidecar.

If the worker fails the startup health check, the API still boots and `classifyLocally()` returns null (silent Gemini/regex fallback).

CLI still works for one-off checks:

```bash
python3 backend/ml/predict.py "Coffee at Starbucks 200"
```

Stdout is JSON: `{"category":"Food & Dining","confidence":0.83}`

If the `.pkl` files are missing, the CLI exits non-zero. The worker never starts, and Node falls through.

## Confidence threshold

Node uses the classifier category only when `confidence >= 0.75`.

Override without code changes:

```bash
ML_CATEGORY_THRESHOLD=0.8
```

Set this in `backend/.env`. Lower = more local hits, more risk of a wrong category. Higher = more Gemini category calls.

## Runtime path

`classifyLocally()` talks to the worker. High-confidence hits skip Gemini. Errors or a down worker fall through silently. Debug logs look like:

`[ai/parse] category_path=classifier fields_path=ledger fallback confidence=0.91`
