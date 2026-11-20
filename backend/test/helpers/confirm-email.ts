import request from 'supertest';
import type { App } from 'supertest/types.js';

/** Uses the real verification service and the isolated Mailpit inbox, never a bypass. */
export async function confirmationToken(email: string): Promise<string> {
  const mailbox = process.env.MAILPIT_TEST_URL;
  if (!mailbox)
    throw new Error(
      'Run npm run test:integration from the repository root to start the isolated services.',
    );
  for (let attempt = 0; attempt < 80; attempt++) {
    const response = await fetch(
      `${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const data = (await response.json()) as { messages?: { ID: string }[] };
    for (const message of data.messages ?? []) {
      const detail = (await fetch(
        `${mailbox}/api/v1/message/${message.ID}`,
      ).then((r) => r.json())) as { HTML?: string; Text?: string };
      const token = `${detail.HTML} ${detail.Text}`.match(
        /token=([a-f0-9]{64})/,
      )?.[1];
      if (token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No verification mail arrived for ${email}`);
}

export async function confirmTestEmail(
  server: App,
  session: { accessToken: string; user: { email: string } },
): Promise<void> {
  await request(server)
    .get('/api/verification/me')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .expect(200);
  const token = await confirmationToken(session.user.email);
  await request(server)
    .post('/api/verification/email/confirm')
    .send({ token })
    .expect(200);
}
