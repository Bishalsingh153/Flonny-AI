function inRange(date, start, end) {
  return date >= start && date <= end;
}

function monthBounds(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const end = last.toISOString().split('T')[0];
  return { start, end, label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function summarizePeriod(transactions, start, end) {
  const rows = transactions.filter((t) => inRange(t.date, start, end));
  let income = 0;
  let expense = 0;
  const byCategory = {};
  const byMerchant = {};
  rows.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') income += amt;
    else {
      expense += amt;
      byCategory[t.category] = (byCategory[t.category] || 0) + amt;
      const m = t.merchant || 'Unknown';
      byMerchant[m] = (byMerchant[m] || 0) + amt;
    }
  });
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || null;
  const topMerchant = Object.entries(byMerchant).sort((a, b) => b[1] - a[1])[0] || null;
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  return { rows, income, expense, savings, savingsRate, byCategory, byMerchant, topCategory, topMerchant };
}

function budgetBurn(budgets, byCategory, dayOfMonth, daysInMonth) {
  return budgets.map((b) => {
    const spent = byCategory[b.category] || 0;
    const pace = dayOfMonth > 0 ? spent / dayOfMonth : 0;
    const projected = pace * daysInMonth;
    let blowDay = null;
    if (pace > 0 && b.amount > 0 && spent < b.amount) {
      const remaining = b.amount - spent;
      const daysLeft = remaining / pace;
      const d = new Date();
      d.setDate(d.getDate() + Math.ceil(daysLeft));
      if (d.getMonth() === new Date().getMonth()) {
        blowDay = d.getDate();
      }
    }
    return {
      category: b.category,
      limit: b.amount,
      spent,
      projected,
      over: spent > b.amount,
      blowDay
    };
  });
}

function computeAnomalyIds(transactions) {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const byCat = {};
  expenses.forEach((t) => {
    byCat[t.category] = byCat[t.category] || [];
    byCat[t.category].push(Number(t.amount));
  });
  const merchantCounts = {};
  expenses.forEach((t) => {
    const m = (t.merchant || '').toLowerCase();
    merchantCounts[m] = (merchantCounts[m] || 0) + 1;
  });
  const thisMonth = monthBounds(0);
  const monthExpense = expenses
    .filter((t) => inRange(t.date, thisMonth.start, thisMonth.end))
    .reduce((s, t) => s + Number(t.amount), 0);

  const ids = new Set();
  expenses.forEach((t) => {
    const amounts = byCat[t.category] || [];
    const med = median(amounts);
    const amt = Number(t.amount);
    const newMerchant = merchantCounts[(t.merchant || '').toLowerCase()] === 1;
    if (amounts.length >= 3 && med > 0 && amt > med * 2) ids.add(t.id);
    if (newMerchant && monthExpense > 0 && amt > monthExpense * 0.15) ids.add(t.id);
  });
  return ids;
}

function detectRecurringSuggestions(transactions) {
  const groups = {};
  transactions
    .filter((t) => t.type === 'expense' && t.merchant)
    .forEach((t) => {
      const key = t.merchant.trim().toLowerCase();
      groups[key] = groups[key] || [];
      groups[key].push(t);
    });

  const suggestions = [];
  Object.values(groups).forEach((list) => {
    if (list.length < 2) return;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const a = new Date(sorted[i - 1].date);
      const b = new Date(sorted[i].date);
      gaps.push(Math.abs((b - a) / 86400000));
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avgGap < 20 || avgGap > 40) return;
    const last = sorted[sorted.length - 1];
    const amounts = sorted.map((t) => Number(t.amount));
    const avgAmt = amounts.reduce((s, n) => s + n, 0) / amounts.length;
    const next = new Date(last.date);
    next.setDate(next.getDate() + Math.round(avgGap));
    suggestions.push({
      merchant: last.merchant,
      category: last.category,
      amount: Math.round(avgAmt * 100) / 100,
      cadence: 'monthly',
      next_date: next.toISOString().split('T')[0],
      occurrences: sorted.length,
      description: last.description || last.merchant
    });
  });
  return suggestions.sort((a, b) => b.occurrences - a.occurrences);
}

function buildDeterministicInsights(transactions, budgets) {
  const thisM = monthBounds(0);
  const lastM = monthBounds(-1);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();

  const current = summarizePeriod(transactions, thisM.start, thisM.end);
  const previous = summarizePeriod(transactions, lastM.start, lastM.end);
  const burns = budgetBurn(budgets, current.byCategory, dayOfMonth, daysInMonth);
  const unusual = [];
  Object.entries(current.byCategory).forEach(([cat, spent]) => {
    const prev = previous.byCategory[cat] || 0;
    if (prev > 0 && spent > prev * 1.35) {
      unusual.push({ category: cat, spent, previous: prev, deltaPct: Math.round(((spent - prev) / prev) * 100) });
    }
  });

  const blow = burns.find((b) => b.blowDay && !b.over);
  const over = burns.filter((b) => b.over);

  const cards = [];
  if (unusual[0]) {
    cards.push({
      key: 'unusual',
      title: 'Unusual spend vs last month',
      body: `${unusual[0].category} is up ${unusual[0].deltaPct}% versus last month.`
    });
  } else {
    cards.push({
      key: 'unusual',
      title: 'Spend vs last month',
      body:
        previous.expense > 0
          ? `This month you have spent ${current.expense >= previous.expense ? 'more' : 'less'} than last month so far.`
          : 'Keep logging — month-over-month comparison appears after two months of data.'
    });
  }

  if (over.length) {
    cards.push({
      key: 'burn',
      title: 'Budget already breached',
      body: over.map((b) => b.category).join(', ')
    });
  } else if (blow) {
    cards.push({
      key: 'burn',
      title: 'Budget burn rate',
      body: `${blow.category} is on track to blow by the ${blow.blowDay}th if this pace continues.`
    });
  } else {
    cards.push({
      key: 'burn',
      title: 'Budget burn rate',
      body: 'Category spend is inside a sustainable monthly pace.'
    });
  }

  cards.push({
    key: 'merchant',
    title: 'Top merchant',
    body: current.topMerchant
      ? `${current.topMerchant[0]} is your highest merchant this month.`
      : 'Add expenses to see merchant concentration.'
  });

  const savingsDelta = current.savingsRate - previous.savingsRate;
  cards.push({
    key: 'savings',
    title: 'Savings vs last month',
    body:
      previous.income > 0
        ? `Savings rate is ${current.savingsRate}% (${savingsDelta >= 0 ? '+' : ''}${savingsDelta} pts vs last month).`
        : `Savings rate this month is ${current.savingsRate}%.`
  });

  return {
    period: thisM,
    current,
    previous,
    cards,
    burns,
    unusual
  };
}

module.exports = {
  monthBounds,
  summarizePeriod,
  computeAnomalyIds,
  detectRecurringSuggestions,
  buildDeterministicInsights
};
