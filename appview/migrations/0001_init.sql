-- Indexed records from artists' and listeners' repos. status is only used for tracks:
-- pending | ok | unavailable (set by the verification queue).
CREATE TABLE records (
  uri TEXT PRIMARY KEY,
  did TEXT NOT NULL,
  collection TEXT NOT NULL,
  rkey TEXT NOT NULL,
  cid TEXT NOT NULL,
  json TEXT NOT NULL,
  sort TEXT NOT NULL,
  status TEXT
);
CREATE INDEX records_did_collection ON records (did, collection, sort DESC);
CREATE INDEX records_collection_sort ON records (collection, sort DESC, uri DESC);

CREATE VIRTUAL TABLE search USING fts5(uri UNINDEXED, text);

CREATE TABLE actors (
  did TEXT PRIMARY KEY,
  handle TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  banned INTEGER NOT NULL DEFAULT 0
);

-- actor.verification records published by the service account.
CREATE TABLE verifications (
  did TEXT PRIMARY KEY,
  rkey TEXT NOT NULL,
  kind TEXT NOT NULL
);

CREATE TABLE takedowns (uri TEXT PRIMARY KEY);

-- Private artist data.
CREATE TABLE artists (
  did TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  legal_name TEXT,
  iban TEXT,
  balance_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE subscribers (
  did TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL
);

-- One-month subscription periods, times in unix ms. Each carries 500 net cents.
CREATE TABLE periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  settled INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX periods_did ON periods (did, ends_at);
CREATE INDEX periods_ends ON periods (ends_at);

CREATE TABLE streams (
  play_id TEXT PRIMARY KEY,
  did TEXT NOT NULL,
  track_uri TEXT NOT NULL,
  period_id INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX streams_period ON streams (period_id);

-- Bank credits. status: subscription | artist | unmatched | rejected
CREATE TABLE credits (
  id TEXT PRIMARY KEY,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  reference TEXT,
  sender_name TEXT,
  sender_iban TEXT,
  at INTEGER NOT NULL,
  status TEXT NOT NULL,
  did TEXT
);

-- Society licences, maintained by hand.
CREATE TABLE licences (
  society TEXT NOT NULL,
  country TEXT NOT NULL,
  rate_bps INTEGER NOT NULL,
  PRIMARY KEY (society, country)
);

CREATE TABLE statements (
  month TEXT NOT NULL,
  did TEXT NOT NULL,
  track_uri TEXT NOT NULL,
  streams INTEGER NOT NULL,
  share_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  PRIMARY KEY (month, track_uri)
);
CREATE INDEX statements_did ON statements (did, month);

CREATE TABLE payouts (
  month TEXT NOT NULL,
  did TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  PRIMARY KEY (month, did)
);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter TEXT NOT NULL,
  subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  text TEXT,
  at INTEGER NOT NULL
);
