import { NET_CENTS } from './env';

// Standard VAT rates in basis points for the EU-27 (as of 2026; verify before launch).
const VAT_BPS: Record<string, number> = {
  AT: 2000, BE: 2100, BG: 2000, HR: 2500, CY: 1900, CZ: 2100, DK: 2500, EE: 2400, FI: 2550,
  FR: 2000, DE: 1900, GR: 2400, HU: 2700, IE: 2300, IT: 2200, LV: 2100, LT: 2100, LU: 1700,
  MT: 1800, NL: 2100, PL: 2300, PT: 2300, RO: 2100, SK: 2300, SI: 2200, ES: 2100, SE: 2500,
};

export const isEuCountry = (c: string) => c in VAT_BPS;

/** Gross monthly amount in cents: 500 plus the country's VAT, rounded half up. */
export const monthlyGross = (country: string) =>
  NET_CENTS + Math.floor((NET_CENTS * VAT_BPS[country] + 5000) / 10000);
