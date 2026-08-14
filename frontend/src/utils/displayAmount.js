export function toDisplay(amountInr, currency, rates) {
  const n = Number(amountInr) || 0;
  if (!currency || currency === 'INR' || !rates) return n;
  return n * (rates[currency] || 1);
}

export function formatDisplay(amountInr, currencySymbol, currency, rates) {
  const n = toDisplay(amountInr, currency, rates);
  return `${currencySymbol}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
