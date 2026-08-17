const { monthBounds } = require('./insightsService');

const MIN_SPEND_DAYS = 5;

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(y, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, '0');
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth
  };
}

function dayOfMonth(dateStr) {
  const parts = String(dateStr || '').split('-');
  return Number(parts[2]) || 0;
}

function linearRegression(points) {
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  points.forEach(([x, y]) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });
  const denom = n * sumX2 - sumX * sumX;
  if (!denom) {
    return { intercept: n ? sumY / n : 0, slope: 0 };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { intercept, slope };
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function forecastFromExpenses(expenses, budgetLimit, daysInMonth) {
  const byDay = {};
  (expenses || []).forEach((t) => {
    if (t.type && t.type !== 'expense') return;
    const day = dayOfMonth(t.date);
    if (day < 1) return;
    byDay[day] = (byDay[day] || 0) + (Number(t.amount) || 0);
  });

  const spendDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  if (spendDays.length < MIN_SPEND_DAYS) {
    return {
      enoughData: false,
      message: 'Not enough data yet',
      daysWithSpend: spendDays.length
    };
  }

  let cumulative = 0;
  const points = spendDays.map((day) => {
    cumulative += byDay[day];
    return [day, cumulative];
  });
  const spentSoFar = cumulative;
  const { intercept, slope } = linearRegression(points);
  const rawProjection = intercept + slope * daysInMonth;
  const projectedTotal = roundMoney(Math.max(spentSoFar, rawProjection, 0));

  const result = {
    enoughData: true,
    projectedTotal,
    spentSoFar: roundMoney(spentSoFar),
    daysWithSpend: spendDays.length
  };

  if (budgetLimit == null || !Number.isFinite(Number(budgetLimit))) {
    return result;
  }

  const limit = Number(budgetLimit);
  const exceedsByAmount = roundMoney(Math.max(0, projectedTotal - limit));
  return {
    ...result,
    budgetLimit: roundMoney(limit),
    willExceedBudget: projectedTotal > limit,
    exceedsByAmount
  };
}

module.exports = {
  MIN_SPEND_DAYS,
  linearRegression,
  forecastFromExpenses,
  currentMonthRange
};
