import React from 'react';
import { formatDisplay } from '../../utils/displayAmount';

export const ForecastHint = ({ forecast, currencySymbol, currency, fxRates }) => {
  if (!forecast) return null;
  if (forecast.enoughData === false) {
    return (
      <div className="forecast-hint">
        Projected: not enough data yet (need 5 days of spend this month)
      </div>
    );
  }
  if (!forecast.enoughData) return null;

  const projected = formatDisplay(forecast.projectedTotal, currencySymbol, currency, fxRates);
  if (forecast.budgetLimit == null) {
    return <div className="forecast-hint">Projected: {projected}</div>;
  }

  const budget = formatDisplay(forecast.budgetLimit, currencySymbol, currency, fxRates);
  if (forecast.willExceedBudget) {
    const over = formatDisplay(forecast.exceedsByAmount, currencySymbol, currency, fxRates);
    return (
      <div className="forecast-hint warning">
        Projected: {projected} (Budget: {budget}) — on track to exceed by {over}
      </div>
    );
  }

  return (
    <div className="forecast-hint">
      Projected: {projected} (Budget: {budget}) — on track
    </div>
  );
};
