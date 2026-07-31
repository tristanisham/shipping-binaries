import { createRandomToken, hashToken } from "../auth/token.js";

export const SUBSCRIBER_EMAIL_MAX_LENGTH = 254;
export const SUBSCRIBER_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
export const SUBSCRIBER_CONFIRMATION_RESEND_MS = 10 * 60 * 1000;

export interface Subscriber {
  confirmationSentAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  email: string;
  id: number;
  unsubscribedAt: string | null;
  updatedAt: string;
  userId: number | null;
}

interface SubscriberRow {
  confirmation_sent_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  email: string;
  id: number;
  unsubscribed_at: string | null;
  updated_at: string;
  user_id: number | null;
}

export interface PendingSubscriptionResult {
  confirmationToken: string | null;
  subscriber: Subscriber;
}

const SUBSCRIBER_COLUMNS =
  "id, email, user_id, confirmation_sent_at, confirmed_at, unsubscribed_at, created_at, updated_at";

const subscriberFromRow = (row: SubscriberRow): Subscriber => ({
  confirmationSentAt: row.confirmation_sent_at,
  confirmedAt: row.confirmed_at,
  createdAt: row.created_at,
  email: row.email,
  id: row.id,
  unsubscribedAt: row.unsubscribed_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
});

export const normalizeSubscriberEmail = (email: string): string =>
  email.trim().toLowerCase();

export const isValidSubscriberEmail = (email: string): boolean => {
  const normalized = normalizeSubscriberEmail(email);
  return normalized.length <= SUBSCRIBER_EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+$/.test(normalized);
};

export const getSubscriberByEmail = async (
  db: D1Database,
  email: string,
): Promise<Subscriber | null> => {
  const row = await db
    .prepare(
      `SELECT ${SUBSCRIBER_COLUMNS}
       FROM subscribers
       WHERE email = ?1
       LIMIT 1`,
    )
    .bind(normalizeSubscriberEmail(email))
    .first<SubscriberRow>();

  return row ? subscriberFromRow(row) : null;
};

export const getSubscriberForUser = async (
  db: D1Database,
  userId: number,
): Promise<Subscriber | null> => {
  const row = await db
    .prepare(
      `SELECT ${SUBSCRIBER_COLUMNS}
       FROM subscribers
       WHERE user_id = ?1
         AND confirmed_at IS NOT NULL
       ORDER BY confirmed_at DESC, id DESC
       LIMIT 1`,
    )
    .bind(userId)
    .first<SubscriberRow>();

  return row ? subscriberFromRow(row) : null;
};

export const preparePendingSubscription = async (
  db: D1Database,
  email: string,
): Promise<PendingSubscriptionResult> => {
  if (!isValidSubscriberEmail(email)) {
    throw new Error("invalid subscriber email");
  }

  const normalized = normalizeSubscriberEmail(email);
  const confirmationToken = createRandomToken();
  const tokenHash = await hashToken(confirmationToken);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SUBSCRIBER_CONFIRMATION_TTL_MS,
  ).toISOString();
  const resendBefore = new Date(
    now.getTime() - SUBSCRIBER_CONFIRMATION_RESEND_MS,
  ).toISOString();
  const claimed = await db
    .prepare(
      `INSERT INTO subscribers (
         email,
         confirmation_token_hash,
         confirmation_expires_at,
         confirmation_sent_at
       )
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (email) DO UPDATE
       SET confirmation_token_hash = excluded.confirmation_token_hash,
           confirmation_expires_at = excluded.confirmation_expires_at,
           confirmation_sent_at = excluded.confirmation_sent_at,
           updated_at = CURRENT_TIMESTAMP
       WHERE subscribers.confirmed_at IS NULL
         AND (
           subscribers.confirmation_sent_at IS NULL
           OR subscribers.confirmation_sent_at <= ?5
         )
       RETURNING ${SUBSCRIBER_COLUMNS}`,
    )
    .bind(normalized, tokenHash, expiresAt, now.toISOString(), resendBefore)
    .first<SubscriberRow>();

  if (claimed) {
    return {
      confirmationToken,
      subscriber: subscriberFromRow(claimed),
    };
  }

  const subscriber = await getSubscriberByEmail(db, normalized);

  if (!subscriber) {
    throw new Error("subscriber row could not be read");
  }

  return {
    confirmationToken: null,
    subscriber,
  };
};

export const releasePendingSubscription = async (
  db: D1Database,
  id: number,
  confirmationToken: string,
): Promise<void> => {
  const tokenHash = await hashToken(confirmationToken);
  await db
    .prepare(
      `UPDATE subscribers
       SET confirmation_token_hash = NULL,
           confirmation_expires_at = NULL,
           confirmation_sent_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1
         AND confirmation_token_hash = ?2
         AND confirmed_at IS NULL`,
    )
    .bind(id, tokenHash)
    .run();
};

export const confirmSubscription = async (
  db: D1Database,
  confirmationToken: string,
): Promise<Subscriber | null> => {
  const tokenHash = await hashToken(confirmationToken);
  const row = await db
    .prepare(
      `UPDATE subscribers
       SET confirmation_token_hash = NULL,
           confirmation_expires_at = NULL,
           confirmed_at = CURRENT_TIMESTAMP,
           unsubscribed_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE confirmation_token_hash = ?1
         AND confirmed_at IS NULL
         AND confirmation_expires_at > ?2
       RETURNING ${SUBSCRIBER_COLUMNS}`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first<SubscriberRow>();

  return row ? subscriberFromRow(row) : null;
};

export const subscribeUser = async (
  db: D1Database,
  userId: number,
  email: string,
): Promise<Subscriber> => {
  if (!isValidSubscriberEmail(email)) {
    throw new Error("invalid subscriber email");
  }

  const row = await db
    .prepare(
      `INSERT INTO subscribers (
         email,
         user_id,
         confirmed_at
       )
       VALUES (?1, ?2, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO UPDATE
       SET user_id = excluded.user_id,
           confirmation_token_hash = NULL,
           confirmation_expires_at = NULL,
           confirmed_at = COALESCE(
             subscribers.confirmed_at,
             CURRENT_TIMESTAMP
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE subscribers.user_id IS NULL
          OR subscribers.user_id = excluded.user_id
       RETURNING ${SUBSCRIBER_COLUMNS}`,
    )
    .bind(normalizeSubscriberEmail(email), userId)
    .first<SubscriberRow>();

  if (!row) {
    throw new Error("subscriber belongs to another user");
  }

  return subscriberFromRow(row);
};

export const getAllSubscribers = async (
  db: D1Database,
): Promise<readonly Subscriber[]> => {
  const result = await db
    .prepare(
      `SELECT ${SUBSCRIBER_COLUMNS}
       FROM subscribers
       WHERE confirmed_at IS NOT NULL
       ORDER BY confirmed_at DESC, id DESC`,
    )
    .all<SubscriberRow>();

  return result.results.map(subscriberFromRow);
};

export const unsubscribeSubscriber = async (
  db: D1Database,
  id: number,
): Promise<boolean> => {
  const result = await db
    .prepare(
      `UPDATE subscribers
       SET unsubscribed_at = COALESCE(
             unsubscribed_at,
             CURRENT_TIMESTAMP
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1 AND confirmed_at IS NOT NULL`,
    )
    .bind(id)
    .run();

  return result.meta.changes === 1;
};
