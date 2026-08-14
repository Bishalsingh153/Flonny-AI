const FALLBACK_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  JPY: 1.78
};

let cached = { rates: { ...FALLBACK_RATES }, fetchedAt: 0 };

async function getRates() {
  const now = Date.now();
  if (now - cached.fetchedAt < 6 * 60 * 60 * 1000 && cached.fetchedAt) {
    return cached.rates;
  }

  const sources = [
    'https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP,JPY',
    'https://open.er-api.com/v6/latest/INR'
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.rates || {};
      const rates = {
        INR: 1,
        USD: raw.USD,
        EUR: raw.EUR,
        GBP: raw.GBP,
        JPY: raw.JPY
      };
      if (!rates.USD) throw new Error('FX payload missing USD');
      cached = { rates, fetchedAt: now };
      return cached.rates;
    } catch (err) {
      console.error(`FX fetch failed (${url}):`, err.message);
    }
  }

  cached = { rates: { ...FALLBACK_RATES }, fetchedAt: now };
  return cached.rates;
}

function toInr(amount, currency, rates) {
  const code = (currency || 'INR').toUpperCase();
  if (code === 'INR') return amount;
  const rate = rates[code];
  if (!rate) return amount;
  return amount / rate;
}

function fromInr(amountInr, currency, rates) {
  const code = (currency || 'INR').toUpperCase();
  if (code === 'INR') return amountInr;
  const rate = rates[code];
  if (!rate) return amountInr;
  return amountInr * rate;
}

module.exports = { getRates, toInr, fromInr, FALLBACK_RATES };
