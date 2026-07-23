"use client";

import { SUPPORTED_CURRENCIES } from '@/services/currency/constants';
import { useMoneyDisplay } from '@/hooks/use-money-display';

interface CurrencySelectorProps {
  className?: string;
}

/** Workspace display currency picker — changes display only, never regenerates pricing. */
export function CurrencySelector({ className }: CurrencySelectorProps) {
  const { displayCurrency, setDisplayCurrency } = useMoneyDisplay();

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <label htmlFor="display-currency" className="text-xs text-muted-foreground">
        Currency
      </label>
      <select
        id="display-currency"
        value={displayCurrency}
        onChange={(e) => setDisplayCurrency(e.target.value as typeof displayCurrency)}
        className="rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-xs font-medium focus:border-signal focus:outline-none"
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </div>
  );
}
