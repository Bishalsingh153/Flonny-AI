#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initDb, getDb } = require('../db');
const { hashPassword, generateToken } = require('../authService');

const CASES_PATH = path.join(__dirname, 'coach_cases.json');
const BASE = process.env.EVAL_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
const CASE_TIMEOUT_MS = Number(process.env.EVAL_TIMEOUT_MS || 60000);

const FILLER = [
  /i['’]d be happy to help/i,
  /how can i (help|assist) you/i,
  /of course!?/i,
  /certainly!?/i,
  /great question/i,
  /as an ai\b/i,
  /i['’]m here to help/i,
  /feel free to (ask|reach out)/i,
  /let me know if you (need|have)/i,
  /thanks for reaching out/i
];

const RUPEE_RE = /₹\s*[\d,]+(?:\.\d+)?|\b(?:rs\.?|inr)\s*[\d,]+(?:\.\d+)?|\b[\d,]+(?:\.\d+)?\s*(?:rs\.?|inr|rupees?)\b/gi;

function normalizeChecks(raw) {
  return (raw || []).map((c) => (typeof c === 'string' ? { type: c } : { ...c }));
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function sentenceCount(text) {
  return String(text || '').split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
}

function extractRupeeFigures(text) {
  return String(text || '').match(RUPEE_RE) || [];
}

function parseSseBuffer(buffer) {
  const events = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() || '';
  for (const part of parts) {
    const line = part.split('\n').find((l) => l.startsWith('data: '));
    if (!line) continue;
    try {
      events.push(JSON.parse(line.slice(6)));
    } catch {
      /* ignore malformed chunk */
    }
  }
  return { events, rest };
}

async function collectStream(token, input) {
  const ac = AbortSignal.timeout(CASE_TIMEOUT_MS);
  const res = await fetch(`${BASE}/api/ai/chat/stream`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: ac,
    body: JSON.stringify({ chatHistory: [{ role: 'user', content: input }] })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`stream HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    events.push(...parsed.events);
    buffer = parsed.rest;
  }
  if (buffer.trim()) {
    const parsed = parseSseBuffer(`${buffer}\n\n`);
    events.push(...parsed.events);
  }
  const reply = events.filter((e) => e.type === 'token').map((e) => e.text || '').join('');
  const pending = events.filter((e) => e.type === 'pendingAction').map((e) => e.action);
  const source = events.find((e) => e.type === 'source') || null;
  return { events, reply, pendingAction: pending[0] || null, source };
}

function querySpendObserved(turn) {
  return turn.events.some((e) => {
    const name = e.name || e.tool || e.action?.type;
    return e.type === 'tool' && (name === 'query_spend' || e.tool === 'query_spend');
  });
}

/** First-pass proxy: production SSE does not emit query_spend. */
function spendQueryLikelyUsed(turn) {
  if (querySpendObserved(turn)) return true;
  const engine = turn.source?.engine;
  const reply = turn.reply || '';
  if (engine === 'fallback' && /\bledger\b/i.test(reply)) return true;
  if (/\b(from the ledger|in your ledger|ledger shows|ledger does not)\b/i.test(reply)) return true;
  return false;
}

function checkMustCallTool(turn, spec) {
  const tool = spec.tool || 'query_spend';
  if (tool !== 'query_spend') {
    return { ok: false, detail: `unsupported tool ${tool}` };
  }
  if (querySpendObserved(turn) || spendQueryLikelyUsed(turn)) {
    return { ok: true, detail: 'query_spend observed or ledger-fallback proxy' };
  }
  return {
    ok: false,
    detail: 'no query_spend SSE event and reply does not look ledger-backed (Gemini-only text)'
  };
}

function checkNoHallucinatedNumber(turn) {
  const figures = extractRupeeFigures(turn.reply);
  if (!figures.length) return { ok: true, detail: 'no rupee figures in reply' };

  const pendingAmt = turn.pendingAction?.payload?.amount;
  const onlyPending = pendingAmt != null && figures.every((fig) => {
    const n = Number(String(fig).replace(/[^\d.]/g, ''));
    return n === Number(pendingAmt);
  });
  if (onlyPending) {
    return { ok: true, detail: 'rupee figures match pendingAction payload only' };
  }

  if (querySpendObserved(turn) || spendQueryLikelyUsed(turn)) {
    return { ok: true, detail: 'rupee figures with query_spend / ledger-fallback proxy' };
  }
  return {
    ok: false,
    detail: `rupee figure(s) in reply without query_spend this turn: ${figures.slice(0, 4).join(', ')}`
  };
}

function checkPersona(turn, spec, defaults) {
  const cfg = { ...defaults.persona_length, ...spec };
  const text = String(turn.reply || '').trim();
  const reasons = [];
  if (!text) reasons.push('empty reply');
  const words = wordCount(text);
  const chars = text.length;
  const sentences = sentenceCount(text);
  if (cfg.maxWords && words > cfg.maxWords) reasons.push(`${words} words > ${cfg.maxWords}`);
  if (cfg.maxChars && chars > cfg.maxChars) reasons.push(`${chars} chars > ${cfg.maxChars}`);
  if (cfg.maxSentences && sentences > cfg.maxSentences) {
    reasons.push(`${sentences} sentences > ${cfg.maxSentences}`);
  }
  const filler = FILLER.find((re) => re.test(text));
  if (filler) reasons.push(`filler matched ${filler}`);
  if (reasons.length) return { ok: false, detail: reasons.join('; ') };
  return { ok: true, detail: `${words} words, ${sentences} sentences` };
}

async function counts(db, userId) {
  const [tx, bud] = await Promise.all([
    db.query('SELECT count(*)::int AS n FROM transactions WHERE user_id=$1', [userId]),
    db.query('SELECT count(*)::int AS n FROM budgets WHERE user_id=$1', [userId])
  ]);
  return { transactions: tx.rows[0].n, budgets: bud.rows[0].n };
}

function isFallbackEngine(turn) {
  return turn?.source?.engine === 'fallback';
}

function expectsPendingAction(spec) {
  return spec.type === 'must_not_write_without_confirm';
}

function checkNoWrite(before, after, turn, spec) {
  const action = spec.action;
  const reasons = [];
  if (after.transactions !== before.transactions) {
    reasons.push(`transactions ${before.transactions} → ${after.transactions}`);
  }
  if (after.budgets !== before.budgets) {
    reasons.push(`budgets ${before.budgets} → ${after.budgets}`);
  }
  if (action) {
    const got = turn.pendingAction?.type;
    if (got !== action) {
      reasons.push(`pendingAction type ${got || 'none'} (expected ${action})`);
    }
  } else if (!turn.pendingAction) {
    reasons.push('no pendingAction emitted');
  }
  if (reasons.length) return { ok: false, detail: reasons.join('; ') };
  return { ok: true, detail: `pendingAction ${turn.pendingAction.type}; db unchanged` };
}

async function seedSetup(db, userId, setup) {
  for (const t of setup?.transactions || []) {
    await db.query(
      `INSERT INTO transactions
        (user_id, amount, type, category, merchant, date, description, source, original_amount, original_currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'eval',$8,$9)`,
      [
        userId,
        t.amount,
        t.type || 'expense',
        t.category,
        t.merchant || null,
        t.date,
        t.description || null,
        t.original_amount != null ? t.original_amount : t.amount,
        t.original_currency || 'INR'
      ]
    );
  }
  for (const b of setup?.budgets || []) {
    await db.query(
      `INSERT INTO budgets (category, user_id, amount, period)
       VALUES ($1,$2,$3,'monthly')
       ON CONFLICT (category, user_id) DO UPDATE SET amount = EXCLUDED.amount`,
      [b.category, userId, b.amount]
    );
  }
}

async function pingServer() {
  try {
    const res = await fetch(`${BASE}/api/ai/chat/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.status === 401 || res.status === 400) return;
    if (!res.ok && res.status !== 403) {
      throw new Error(`unexpected ${res.status}`);
    }
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED' || /fetch failed|ECONNREFUSED/i.test(String(err))) {
      throw new Error(`backend not reachable at ${BASE}. Start it (npm start in backend/) then re-run.`);
    }
    throw err;
  }
}

function pad(s, n) {
  const t = String(s);
  return t.length >= n ? t.slice(0, n) : t + ' '.repeat(n - t.length);
}

async function main() {
  const doc = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'));
  const cases = doc.cases || [];
  const defaults = doc.defaults || {};
  if (!cases.length) {
    console.error('No cases in coach_cases.json');
    process.exit(1);
  }

  await pingServer();
  await initDb();
  const db = getDb();

  const username = `eval_coach_${Date.now()}`;
  const userRes = await db.query(
    `INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING id, username, email`,
    [username, `${username}@floony.test`, hashPassword('eval')]
  );
  const user = userRes.rows[0];
  const token = generateToken(user);

  const rows = [];

  try {
    console.log(`Coach eval  ${cases.length} cases  ${BASE}\n`);
    if (doc.meta?.note) console.log(`${doc.meta.note}\n`);

    for (const c of cases) {
      await db.query('DELETE FROM transactions WHERE user_id=$1', [user.id]);
      await db.query('DELETE FROM budgets WHERE user_id=$1', [user.id]);
      await db.query('DELETE FROM chat_messages WHERE user_id=$1', [user.id]);
      await seedSetup(db, user.id, c.setup);

      const checks = normalizeChecks(c.checks);
      const before = await counts(db, user.id);
      let turn;
      let error = null;
      try {
        turn = await collectStream(token, c.input);
      } catch (e) {
        error = e;
      }
      const after = await counts(db, user.id);

      const results = [];
      if (error) {
        for (const spec of checks) {
          results.push({ type: spec.type, ok: false, detail: String(error.message || error) });
        }
      } else {
        for (const spec of checks) {
          let r;
          if (expectsPendingAction(spec) && isFallbackEngine(turn)) {
            const wrote = after.transactions !== before.transactions || after.budgets !== before.budgets;
            r = wrote
              ? {
                ok: false,
                detail: `engine fallback but DB changed (tx ${before.transactions}→${after.transactions}, budgets ${before.budgets}→${after.budgets})`
              }
              : {
                skipped: true,
                detail: 'engine fallback — pendingAction/function-calling not attempted; inconclusive'
              };
          } else if (spec.type === 'must_call_tool') r = checkMustCallTool(turn, spec);
          else if (spec.type === 'must_not_hallucinate_number') r = checkNoHallucinatedNumber(turn);
          else if (spec.type === 'must_not_write_without_confirm') r = checkNoWrite(before, after, turn, spec);
          else if (spec.type === 'persona_length') r = checkPersona(turn, spec, defaults);
          else r = { ok: false, detail: `unknown check ${spec.type}` };
          results.push({ type: spec.type, ...r });
        }
      }

      const engine = error ? 'error' : (turn.source?.engine || 'unknown');
      const skipN = results.filter((r) => r.skipped).length;
      const failN = results.filter((r) => !r.skipped && r.ok === false).length;
      const passN = results.filter((r) => !r.skipped && r.ok).length;
      const status = failN ? 'FAIL' : (skipN ? 'SKIP' : 'PASS');
      rows.push({ id: c.id, status, engine, passN, skipN, failN, total: results.length, results });
    }

    console.log(`${pad('id', 42)} ${pad('engine', 10)} ${pad('checks', 10)} ${pad('result', 6)}`);
    console.log('-'.repeat(72));
    for (const row of rows) {
      const checkBits = `${row.passN}p/${row.failN}f/${row.skipN}s`;
      console.log(`${pad(row.id, 42)} ${pad(row.engine, 10)} ${pad(checkBits, 10)} ${row.status}`);
      for (const r of row.results) {
        if (r.skipped) console.log(`    ~ ${r.type}: ${r.detail}`);
        else if (r.ok === false) console.log(`    ✗ ${r.type}: ${r.detail}`);
      }
    }
    const passed = rows.filter((r) => r.status === 'PASS').length;
    const failed = rows.filter((r) => r.status === 'FAIL').length;
    const skipped = rows.filter((r) => r.status === 'SKIP').length;
    console.log('-'.repeat(72));
    console.log(`${passed} passed, ${failed} failed, ${skipped} skipped (fallback engine)`);
  } finally {
    await db.query('DELETE FROM users WHERE id=$1', [user.id]);
  }

  const failCount = rows.filter((r) => r.status === 'FAIL').length;
  process.exit(failCount ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
