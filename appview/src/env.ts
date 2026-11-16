export interface Env {
  DB: D1Database;
  JETSTREAM: DurableObjectNamespace;
  VERIFY_QUEUE: Queue<{ uri: string }>;
  // vars
  SERVICE_ACCOUNT_DID: string;
  SERVICE_PDS_URL: string;
  JETSTREAM_URL: string;
  WISE_PROFILE_ID: string;
  WISE_BALANCE_ID: string;
  BANK_IBAN: string;
  BANK_ACCOUNT_HOLDER: string;
  // secrets
  ADMIN_SECRET: string;
  GRANT_PRIVATE_JWK: string;
  PLAY_TOKEN_SECRET: string;
  SERVICE_HANDLE: string;
  SERVICE_APP_PASSWORD: string;
  WISE_API_TOKEN: string;
  WISE_WEBHOOK_PUBLIC_KEY: string;
}

export const SERVICE_DID = 'did:web:musicstreamer.eu';
export const NET_CENTS = 500;
/** Every track needs a source in one of these formats (MP3 or AAC). */
export const BASELINE = ['audio/mpeg', 'audio/mp4'];

export class XrpcError extends Error {
  constructor(public status: number, public error: string, message?: string) {
    super(message ?? error);
  }
}
