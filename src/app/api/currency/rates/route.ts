import { NextResponse } from 'next/server';
import { fetchRatesFromProvider } from '@/services/currency/rate-cache';

/** GET /api/currency/rates — live USD-base exchange rates with fallback. */
export async function GET() {
  const snapshot = await fetchRatesFromProvider();
  return NextResponse.json(snapshot);
}
