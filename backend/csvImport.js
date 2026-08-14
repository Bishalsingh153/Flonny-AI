const { CATEGORIES } = require('./categories');

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim();
    });
    return row;
  });
}

function pick(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== '') return row[name];
  }
  return '';
}

function parseAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const cleaned = String(raw).replace(/[,₹$€£¥]/g, '').replace(/\s/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let year = dmy[3];
    if (year.length === 2) year = `20${year}`;
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
      return `${year}-${day}-${month}`;
    }
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

function guessCategory(description) {
  const text = (description || '').toLowerCase();
  const map = {
    'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining', 'grocery', 'blinkit', 'zepto'],
    Fuel: ['petrol', 'diesel', 'fuel', 'hpcl', 'bpcl', 'iocl'],
    Transportation: ['uber', 'ola', 'metro', 'irctc', 'rapido', 'fastag'],
    Rent: ['rent', 'landlord'],
    Healthcare: ['pharmacy', 'hospital', 'clinic', 'apollo', 'medplus'],
    Education: ['school', 'college', 'course', 'udemy', 'tuition'],
    Subscriptions: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'subscription'],
    Utilities: ['electricity', 'wifi', 'broadband', 'airtel', 'jio', 'vodafone', 'bescom'],
    Shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa'],
    Entertainment: ['movie', 'pvr', 'inox', 'bookmyshow', 'steam'],
    Transfers: ['upi', 'imps', 'neft', 'rtgs', 'transfer'],
    Salary: ['salary', 'payroll'],
    Freelance: ['freelance', 'upwork', 'fiverr']
  };
  for (const [cat, keys] of Object.entries(map)) {
    if (keys.some((k) => text.includes(k))) return cat;
  }
  return 'Other';
}

function mapRow(row) {
  const date = normalizeDate(
    pick(row, ['date', 'txn date', 'transaction date', 'value date', 'posted date', 'tran date'])
  );
  const description = pick(row, [
    'description',
    'narration',
    'remarks',
    'particulars',
    'details',
    'merchant',
    'payee'
  ]);
  const merchant = pick(row, ['merchant', 'payee']) || (description ? description.slice(0, 80) : 'Imported');
  const withdrawal = parseAmount(
    pick(row, ['withdrawal', 'withdrawal amt.', 'debit', 'dr', 'debit amount', 'amount(inr) debit'])
  );
  const deposit = parseAmount(
    pick(row, ['deposit', 'deposit amt.', 'credit', 'cr', 'credit amount', 'amount(inr) credit'])
  );
  let amount = parseAmount(pick(row, ['amount', 'amt', 'inr', 'value']));
  let type = (pick(row, ['type', 'flow', 'transaction type']) || '').toLowerCase();

  if (withdrawal && withdrawal > 0) {
    amount = withdrawal;
    type = 'expense';
  } else if (deposit && deposit > 0) {
    amount = deposit;
    type = 'income';
  } else if (amount !== null) {
    if (!type) {
      type = amount < 0 ? 'expense' : 'income';
    }
    amount = Math.abs(amount);
  }

  if (!date || !amount || amount <= 0) return null;
  if (type !== 'income') type = 'expense';

  const categoryRaw = pick(row, ['category']);
  const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : guessCategory(description || merchant);

  return {
    date,
    amount,
    type,
    category,
    merchant,
    description: description || merchant,
    source: 'import'
  };
}

function duplicateKey(tx) {
  const merchant = (tx.merchant || '').trim().toLowerCase();
  return `${tx.date}|${Number(tx.amount).toFixed(2)}|${merchant}|${tx.type}`;
}

function mapCsvText(text) {
  const rows = parseCsv(text);
  return rows.map(mapRow).filter(Boolean);
}

module.exports = { parseCsv, mapCsvText, duplicateKey, guessCategory };
