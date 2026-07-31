export const SUBSCRIBER_EMAIL_MAX_LENGTH = 254;

export interface Subscriber {
  createdAt: string;
  email: string;
  id: number;
  updatedAt: string;
}

interface SubscriberRow {
  created_at: string;
  email: string;
  id: number;
  updated_at: string;
}

export interface SubscribeResult {
  created: boolean;
  subscriber: Subscriber;
}

const SUBSCRIBER_COLUMNS = "id, email, created_at, updated_at";

const subscriberFromRow = (row: SubscriberRow): Subscriber => ({
  createdAt: row.created_at,
  email: row.email,
  id: row.id,
  updatedAt: row.updated_at,
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

export const subscribe = async (
  db: D1Database,
  email: string,
): Promise<SubscribeResult> => {
  if (!isValidSubscriberEmail(email)) {
    throw new Error("invalid subscriber email");
  }

  const normalized = normalizeSubscriberEmail(email);
  const result = await db
    .prepare(
      `INSERT INTO subscribers (email)
       VALUES (?1)
       ON CONFLICT (email) DO NOTHING`,
    )
    .bind(normalized)
    .run();
  const subscriber = await getSubscriberByEmail(db, normalized);

  if (!subscriber) {
    throw new Error("subscriber row could not be read");
  }

  return {
    created: result.meta.changes === 1,
    subscriber,
  };
};

export const deleteSubscriber = async (
  db: D1Database,
  id: number,
): Promise<void> => {
  await db
    .prepare("DELETE FROM subscribers WHERE id = ?1")
    .bind(id)
    .run();
};
