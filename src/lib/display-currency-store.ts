"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INTERNAL_PRICING_CURRENCY, type SupportedCurrency } from '@/services/currency/constants';

interface DisplayCurrencyState {
  /** Workspace display currency — all USD estimates convert to this for UI. */
  currency: SupportedCurrency;
  setCurrency: (code: SupportedCurrency) => void;
}

export const useDisplayCurrencyStore = create<DisplayCurrencyState>()(
  persist(
    (set) => ({
      currency: INTERNAL_PRICING_CURRENCY as SupportedCurrency,
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'salespilot_display_currency' },
  ),
);
