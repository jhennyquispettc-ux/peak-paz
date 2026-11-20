import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

const base = process.env.TEST_VERIFICATION_URL!;
const headers = {
  'Content-Type': 'application/json',
  'X-Service-Key': process.env.VERIFICATION_SERVICE_KEY!,
};
const userId = randomUUID();
const email = `verification.${userId}@example.com`;
const identity = { userId, email, firstName: '<Ana & Juan>', role: 'GUIDE' };
const docs = ['NATIONAL_ID', 'GUIDE_CREDENTIAL', 'FIRST_AID'].map((type) => ({
  id: randomUUID(),
  type,
  expiresAt: '2030-12-31',
}));
const snapshot = {
  firstName: 'Ana',
  lastName: 'Mamani',
  nationalId: '6123456',
  documents: docs,
};
let token: string;
let reviewId: string;
let db: DataSource;
const request = (path: string, body?: unknown, customHeaders = headers) =>
  fetch(`${base}/internal${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: customHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function emailContent() {
  for (let i = 0; i < 80; i++) {
    const found = (await fetch(
      `${process.env.MAILPIT_TEST_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    ).then((r) => r.json())) as { messages: { ID: string }[] };
    if (found.messages.length)
      return fetch(
        `${process.env.MAILPIT_TEST_URL}/api/v1/message/${found.messages[0].ID}`,
      ).then((r) => r.json()) as Promise<{ HTML: string }>;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Verification email not delivered');
}

beforeAll(async () => {
  db = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await db.initialize();
});
afterAll(async () => {
  if (db?.isInitialized) await db.destroy();
});

it('refuses unauthenticated internal requests', async () => {
  expect(
    (
      await request('/cases', identity, {
        'Content-Type': 'application/json',
      } as typeof headers)
    ).status,
  ).toBe(401);
});
it('rejects unexpected fields and does not accept passwords', async () => {
  expect(
    (
      await request('/cases', {
        ...identity,
        password: 'must-never-cross-services',
      })
    ).status,
  ).toBe(400);
});
it('persists a pending case and queues the email', async () => {
  const response = await request('/cases', identity);
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.emailVerifiedAt).toBeNull();
  expect(body).not.toHaveProperty('tokenHash');
  expect(body).not.toHaveProperty('tokenNonce');
  const content = await emailContent();
  expect(content.HTML).toContain('&lt;Ana &amp; Juan&gt;');
  token = content.HTML.match(/token=([a-f0-9]{64})/)![1];
});
it('retries case creation without rotating tokens or sending a new challenge', async () => {
  const before = await (await request(`/cases/${userId}`)).json();
  const after = await (await request('/cases', identity)).json();
  expect(after.tokenExpiresAt).toBe(before.tokenExpiresAt);
});
it('refuses to replace an existing identity', async () => {
  expect(
    (await request('/cases', { ...identity, email: 'someoneelse@example.com' }))
      .status,
  ).toBe(409);
});
it('rate limits resends using persisted state', async () => {
  expect((await request(`/cases/${userId}/resend`, {})).status).toBe(429);
});
it('refuses an invalid token', async () => {
  expect(
    (await request('/email/confirm', { token: '0'.repeat(64) })).status,
  ).toBe(400);
});
it('does not approve guide documents before email verification', async () => {
  const review = await (
    await request(`/cases/${userId}/reviews`, snapshot)
  ).json();
  reviewId = review.id;
  const response = await request(
    `/cases/${userId}/reviews/${reviewId}/decision`,
    { status: 'APPROVED', reviewerId: randomUUID() },
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe('EMAIL_NOT_VERIFIED');
});
it('consumes a token only once under concurrent confirmation requests', async () => {
  const results = await Promise.all([
    request('/email/confirm', { token }),
    request('/email/confirm', { token }),
  ]);
  expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
    200, 400,
  ]);
});
it('rejects a review without a meaningful rejection reason', async () => {
  expect(
    (
      await request(`/cases/${userId}/reviews/${reviewId}/decision`, {
        status: 'REJECTED',
        reviewerId: randomUUID(),
        reason: '     ',
      })
    ).status,
  ).toBe(400);
});
it('records a manual approval and makes its retries idempotent', async () => {
  const decision = { status: 'APPROVED', reviewerId: randomUUID() };
  const first = await (
    await request(`/cases/${userId}/reviews/${reviewId}/decision`, decision)
  ).json();
  const again = await (
    await request(`/cases/${userId}/reviews/${reviewId}/decision`, decision)
  ).json();
  expect(first.status).toBe('APPROVED');
  expect(first.reviewerId).toBe(decision.reviewerId);
  expect(again.id).toBe(first.id);
});
it('creates a new pending review when a document is replaced', async () => {
  const changed = {
    ...snapshot,
    documents: docs.map((d) => ({ ...d, id: randomUUID() })),
  };
  const result = await (
    await request(`/cases/${userId}/reviews`, changed)
  ).json();
  expect(result.status).toBe('PENDING');
  expect(result.id).not.toBe(reviewId);
  expect(
    (
      await request(`/cases/${userId}/reviews/${reviewId}/decision`, {
        status: 'APPROVED',
        reviewerId: randomUUID(),
      })
    ).status,
  ).toBe(409);
});
it('refuses incomplete or expired guide documents even after email confirmation', async () => {
  for (const documents of [
    [],
    docs.map((d) => ({ ...d, expiresAt: '2020-01-01' })),
  ]) {
    const review = await (
      await request(`/cases/${userId}/reviews`, { ...snapshot, documents })
    ).json();
    const response = await request(
      `/cases/${userId}/reviews/${review.id}/decision`,
      { status: 'APPROVED', reviewerId: randomUUID() },
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('DOCUMENTS_INCOMPLETE');
  }
});
it('rejects expired email challenges and invalidates old tokens on resend', async () => {
  const id = randomUUID();
  const account = {
    ...identity,
    userId: id,
    email: `expired.${id}@example.com`,
    role: 'TOURIST',
  };
  await request('/cases', account);
  const [original] = await db.query(
    'SELECT "tokenHash" FROM verification_cases WHERE "userId"=$1',
    [id],
  );
  await db.query(
    'UPDATE verification_cases SET "tokenExpiresAt"=now()-interval \'1 minute\', "nextResendAt"=now()-interval \'1 minute\' WHERE "userId"=$1',
    [id],
  );
  // An expired challenge must not become valid even if its email is delivered late.
  const { createHmac } = await import('node:crypto');
  const [record] = await db.query(
    'SELECT "tokenNonce" FROM verification_cases WHERE "userId"=$1',
    [id],
  );
  const expired = createHmac('sha256', process.env.EMAIL_TOKEN_SECRET!)
    .update(`${id}:${record.tokenNonce}`)
    .digest('hex');
  expect((await request('/email/confirm', { token: expired })).status).toBe(
    400,
  );
  expect((await request(`/cases/${id}/resend`, {})).status).toBe(200);
  const [renewed] = await db.query(
    'SELECT "tokenHash" FROM verification_cases WHERE "userId"=$1',
    [id],
  );
  expect(renewed.tokenHash).not.toBe(original.tokenHash);
  expect((await request('/email/confirm', { token: expired })).status).toBe(
    400,
  );
});
