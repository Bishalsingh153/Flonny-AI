const { getDb } = require('./db');

const MIN_HISTORY = 5;
const SIGMA = 3;

function sixMonthsAgoDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().split('T')[0];
}

function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function stdDev(nums) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance = nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function evaluateAnomaly(category, amount, historicalAmounts) {
  const amounts = (historicalAmounts || []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (amounts.length < MIN_HISTORY) {
    return { isAnomaly: false, reason: null };
  }
  const avg = mean(amounts);
  const sd = stdDev(amounts);
  const amt = Number(amount) || 0;
  if (!(amt > avg + SIGMA * sd)) {
    return { isAnomaly: false, reason: null };
  }
  const multiple = avg > 0 ? amt / avg : amt;
  const reason = `${multiple.toFixed(1)}x your average ${category} spending`;
  return { isAnomaly: true, reason };
}

async function detectAnomaly(userId, category, amount, excludeId) {
  if (!userId || !category) {
    return { isAnomaly: false, reason: null };
  }
  const db = getDb();
  const { rows } = await db.query(
    `SELECT amount FROM transactions
     WHERE user_id = $1 AND type = 'expense' AND category = $2 AND date >= $3
       AND ($4::int IS NULL OR id <> $4)`,
    [userId, category, sixMonthsAgoDate(), excludeId || null]
  );
  return evaluateAnomaly(category, amount, rows.map((r) => r.amount));
}

async function withAnomaly(userId, transaction) {
  if (!transaction) return transaction;
  if (transaction.type !== 'expense') {
    return { ...transaction, is_anomaly: false, anomaly_reason: null };
  }
  const { isAnomaly, reason } = await detectAnomaly(
    userId,
    transaction.category,
    transaction.amount,
    transaction.id
  );
  return { ...transaction, is_anomaly: isAnomaly, anomaly_reason: reason };
}

function annotateTransactions(rows) {
  const since = sixMonthsAgoDate();
  const byCat = {};
  (rows || []).forEach((t) => {
    if (t.type !== 'expense' || t.date < since) return;
    byCat[t.category] = byCat[t.category] || [];
    byCat[t.category].push(t);
  });

  return (rows || []).map((t) => {
    if (t.type !== 'expense') {
      return { ...t, is_anomaly: false, anomaly_reason: null };
    }
    const peers = (byCat[t.category] || []).filter((p) => p.id !== t.id);
    const { isAnomaly, reason } = evaluateAnomaly(
      t.category,
      t.amount,
      peers.map((p) => p.amount)
    );
    return { ...t, is_anomaly: isAnomaly, anomaly_reason: reason };
  });
}

module.exports = {
  detectAnomaly,
  evaluateAnomaly,
  annotateTransactions,
  withAnomaly
};
