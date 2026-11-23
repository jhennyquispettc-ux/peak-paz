import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const api = process.env.DEMO_API_URL ?? 'http://localhost:3010/api';
const mailbox = process.env.DEMO_MAILPIT_URL ?? 'http://localhost:8025';
const password = 'GuiaDemo2026!';
for (const address of [api, mailbox]) {
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL(address).hostname)
  ) {
    throw new Error(
      'Las cuentas ficticias solo se pueden crear contra servicios locales.',
    );
  }
}
const scenarios = JSON.parse(
  await readFile(
    resolve(root, 'docs/demo-verification/scenarios.json'),
    'utf8',
  ),
);
const environment = Object.fromEntries(
  (await readFile(resolve(root, 'backend/.env'), 'utf8'))
    .split('\n')
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const index = line.indexOf('=');
      return [
        line.slice(0, index),
        line
          .slice(index + 1)
          .trim()
          .replace(/^(["'])(.*)\1$/, '$2'),
      ];
    }),
);
if (environment.NODE_ENV === 'production')
  throw new Error('Este comando es solo para desarrollo.');
const suffix = process.argv.includes('--new') ? `.${Date.now()}` : '';
const filenames = {
  NATIONAL_ID: 'identidad-demo.pdf',
  GUIDE_CREDENTIAL: 'credencial-demo.pdf',
  FIRST_AID: 'primeros-auxilios-demo.pdf',
};

async function call(path, { token, body, method } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  const response = await fetch(`${api}${path}`, {
    method: method ?? (body !== undefined ? 'POST' : 'GET'),
    headers,
    body:
      body instanceof FormData
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(
      new Error(
        `${path}: ${data.error ?? response.status} - ${Array.isArray(data.message) ? data.message.join('; ') : (data.message ?? 'Solicitud rechazada')}`,
      ),
      { status: response.status, code: data.error },
    );
  return data;
}

async function emailToken(email) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const found = await fetch(
      `${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
      { signal: AbortSignal.timeout(5000) },
    ).then((response) => response.json());
    for (const message of found.messages ?? []) {
      const detail = await fetch(
        `${mailbox}/api/v1/message/${message.ID}`,
      ).then((response) => response.json());
      const token = `${detail.HTML ?? ''} ${detail.Text ?? ''}`.match(
        /token=([a-f0-9]{64})/,
      )?.[1];
      if (token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    `No llegó el correo local para ${email}. Revisa el microservicio y Mailpit.`,
  );
}

await call('/health');
const mailHealth = await fetch(`${mailbox}/api/v1/messages`, {
  signal: AbortSignal.timeout(5000),
});
if (!mailHealth.ok)
  throw new Error(
    'Mailpit debe estar disponible para verificar los correos de demostración.',
  );
const admin = await call('/auth/login', {
  body: {
    email: environment.SEED_ADMIN_EMAIL,
    password: environment.SEED_ADMIN_PASSWORD,
  },
});
if (admin.user.role !== 'ADMIN')
  throw new Error('La cuenta configurada no es administradora.');
const result = [];
for (const scenario of scenarios) {
  const email = `demo.guia.${scenario.slug}${suffix}@example.com`;
  let session;
  let created = true;
  try {
    session = await call('/auth/register/guide', {
      body: {
        email,
        password,
        firstName: scenario.firstName,
        lastName: scenario.lastName,
        nationalId: scenario.nationalId,
        languages: scenario.languages,
        yearsExperience: scenario.yearsExperience,
        bioEs:
          'Perfil ficticio creado para demostrar el microservicio de verificación de Peak Paz.',
      },
    });
  } catch (error) {
    if (error.code !== 'EMAIL_ALREADY_REGISTERED') throw error;
    created = false;
    session = await call('/auth/login', { body: { email, password } });
    if (
      session.user.role !== 'GUIDE' ||
      session.user.firstName !== scenario.firstName ||
      session.user.lastName !== scenario.lastName
    ) {
      throw new Error(
        `${email} pertenece a otra cuenta. Usa --new para crear un lote independiente.`,
      );
    }
  }
  const token = session.accessToken;
  if (created) {
    // Use the actual API and captured mail: never write verified states directly to a database.
    await call('/verification/me', { token });
    if (scenario.confirmEmail)
      await call('/verification/email/confirm', {
        body: { token: await emailToken(email) },
      });
    for (const type of scenario.documents) {
      const bytes = await readFile(
        resolve(root, 'docs/demo-verification', scenario.slug, filenames[type]),
      );
      const body = new FormData();
      body.set('type', type);
      body.set('expiresAt', '2030-12-31');
      body.set(
        'file',
        new Blob([bytes], { type: 'application/pdf' }),
        filenames[type],
      );
      await call('/guides/me/documents', { token, body });
    }
    if (scenario.documents.length === 3) {
      await call('/guides/me/verification-request', { token, body: {} });
      if (scenario.decision) {
        const profile = await call('/guides/me', { token });
        if (scenario.decision === 'APPROVED') {
          const interview = await call(`/admin/interviews/GUIDE/${profile.id}`, {
            token: admin.accessToken,
            body: {
              scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
              modality: 'IN_PERSON',
              location: 'Oficina de Peak Paz, La Paz',
            },
          });
          await call(`/admin/interviews/${interview.id}/result`, {
            token: admin.accessToken,
            method: 'PATCH',
            body: {
              result: 'PASSED',
              notes: 'Entrevista de demostración satisfactoria.',
              credentialType: 'SIRETUR',
            },
          });
        }
        await call(`/admin/guides/${profile.id}/verification`, {
          token: admin.accessToken,
          method: 'PATCH',
          body: {
            status: scenario.decision,
            ...(scenario.decision === 'REJECTED'
              ? {
                  rejectionReason:
                    'La credencial de demostración no identifica al titular. Carga credencial-corregida.pdf y solicita otra revisión.',
                }
              : {}),
          },
        });
      }
    }
  }
  const profile = await call('/guides/me', { token });
  const verification = await call('/verification/me', { token });
  const access = await fetch(`${api}/guides/me/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const row = {
    name: `${scenario.firstName} ${scenario.lastName}`,
    email,
    password,
    slug: scenario.slug,
    created,
    userId: session.user.id,
    guideId: profile.id,
    emailConfirmed: Boolean(verification.emailVerifiedAt),
    status: profile.verificationStatus,
    documents: profile.documents.length,
    missingDocuments: profile.missingDocuments,
    serviceAccessStatus: access.status,
    reviewHistory: verification.reviews.map((review) => review.status),
    scenario: scenario.description,
  };
  if (
    created &&
    (row.emailConfirmed !== scenario.confirmEmail ||
      row.status !== (scenario.decision ?? 'PENDING') ||
      row.documents !== scenario.documents.length ||
      row.serviceAccessStatus !==
        (scenario.decision === 'APPROVED' ? 200 : 403))
  ) {
    throw new Error(
      `El estado final no coincide con el escenario ${scenario.slug}.`,
    );
  }
  result.push(row);
  console.log(
    `${created ? 'Creado' : 'Conservado'}: ${row.name} | ${email} | correo ${row.emailConfirmed ? 'confirmado' : 'pendiente'} | ${row.status} | documentos ${row.documents}/3 | acceso ${access.status}`,
  );
}
const file = resolve(root, 'var/demo-guides.json');
await mkdir(dirname(file), { recursive: true });
await writeFile(
  file,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      password,
      adminEmail: environment.SEED_ADMIN_EMAIL,
      guides: result,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log('Contraseña de las cuentas ficticias: GuiaDemo2026!');
console.log(
  'Datos y estados en var/demo-guides.json. No se modificaron cuentas ajenas al lote.',
);
console.log(
  'Puedes ejecutar con --new para preparar otro lote sin alterar el actual.',
);
