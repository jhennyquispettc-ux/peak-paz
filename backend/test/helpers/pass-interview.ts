import request from 'supertest';
import type { App } from 'supertest/types.js';

export async function passInterview(
  server: App,
  adminToken: string,
  subject: 'GUIDE' | 'AGENCY',
  id: string,
): Promise<void> {
  const authorization = { Authorization: `Bearer ${adminToken}` };
  const interview = await request(server)
    .post(`/api/admin/interviews/${subject}/${id}`)
    .set(authorization)
    .send({
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      modality: 'IN_PERSON',
      location: 'Oficina de Peak Paz, La Paz',
    })
    .expect(201);
  await request(server)
    .patch(`/api/admin/interviews/${interview.body.id}/result`)
    .set(authorization)
    .send({
      result: 'PASSED',
      notes: 'Presentó sus documentos originales.',
      ...(subject === 'GUIDE'
        ? { credentialType: 'SIRETUR' }
        : { premisesVisited: true }),
    })
    .expect(200);
}
