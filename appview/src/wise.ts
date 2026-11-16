// All Wise-specific code lives here.
import { Env } from './env';

export type Credit = { id: string; cents: number; currency: string; reference: string; senderName: string; senderIban: string; at: number };

/** Wise signs the raw body with RSA PKCS#1 v1.5 / SHA-256; the signature is base64 in X-Signature-SHA256. */
export async function verifyWebhook(env: Env, body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const der = Uint8Array.from(atob(env.WISE_WEBHOOK_PUBLIC_KEY.replace(/-----[A-Z ]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)), new TextEncoder().encode(body));
}

/** EUR credits of the last 14 days from the balance statement. */
export async function fetchCredits(env: Env): Promise<Credit[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 14 * 86_400_000);
  const url = `https://api.wise.com/v1/profiles/${env.WISE_PROFILE_ID}/balance-statements/${env.WISE_BALANCE_ID}/statement.json?currency=EUR&type=COMPACT&intervalStart=${start.toISOString()}&intervalEnd=${end.toISOString()}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${env.WISE_API_TOKEN}` } });
  if (!res.ok) throw new Error(`wise statement: ${res.status} ${await res.text()}`);
  const { transactions } = (await res.json()) as { transactions: any[] };
  return transactions
    .filter((t) => t.type === 'CREDIT')
    .map((t) => ({
      id: t.referenceNumber,
      cents: Math.round(t.amount.value * 100),
      currency: t.amount.currency,
      reference: t.details?.paymentReference ?? t.details?.description ?? '',
      senderName: t.details?.senderName ?? '',
      senderIban: t.details?.senderAccount ?? '',
      at: Date.parse(t.date),
    }));
}

/** CSV in Wise's batch-transfer format. Upload and approve it in the Wise web app. */
export function payoutCsv(rows: { name: string; iban: string; cents: number; reference: string }[]): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = 'name,recipientEmail,paymentReference,receiverType,amountCurrency,amount,sourceCurrency,targetCurrency,amountType,IBAN';
  return [head, ...rows.map((r) => [q(r.name), '', q(r.reference), 'PERSON', 'EUR', (r.cents / 100).toFixed(2), 'EUR', 'EUR', 'TARGET', r.iban].join(','))].join('\n') + '\n';
}
