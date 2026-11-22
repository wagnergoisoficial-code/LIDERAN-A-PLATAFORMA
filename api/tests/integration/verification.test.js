// Verificação de líderes (dados da igreja, documentos, decisão do administrador) e link de convite
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const App = require('../../src/app');
const { getPrismaClient, disconnectPrisma } = require('../../src/config/database');

const stamp = Date.now();
let server;
let BASE;

const call = async (method, path, token, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, ...json };
};

const submit = async (token, fields, files) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  Object.entries(files).forEach(([key, { data, type }]) => form.append(key, new Blob([data], { type }), `${key}.bin`));
  const res = await fetch(`${BASE}/leader-verification`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, ...(await res.json()) };
};

const login = async (email, password = 'Senha1234') => (await call('POST', '/auth/login', null, { email, password })).data?.token;
const birthYears = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

const FIELDS = {
  churchName: 'Igreja Central da Matola', position: 'Líder de jovens', city: 'Matola',
  region: 'Maputo', country: 'Moçambique', phone: '+258 84 000 0000',
};
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const s = {};

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api`;

  s.png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#ffffff' } }).png().toBuffer();

  const leader = await call('POST', '/auth/register', null, {
    name: 'Líder Novo', email: `lv${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
  });
  s.leader = leader.data.token;
  s.leaderId = leader.data.user.id;
  s.other = (await call('POST', '/auth/register', null, {
    name: 'Outro Líder', email: `lo${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
  })).data.token;

  await getPrismaClient().user.create({
    data: { email: `adm${stamp}@t.com`, name: 'Administrador', role: 'admin', password: await bcrypt.hash('Senha1234', 10) },
  });
  s.admin = await login(`adm${stamp}@t.com`);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

describe('verificação de líderes', () => {
  test('líder por verificar não cria comunidade', async () => {
    const church = await call('POST', '/churches', s.leader, { name: 'Antes da verificação' });
    expect(church.status).toBe(403);
    const me = await call('GET', '/leader-verification/me', s.leader);
    expect(me.data).toMatchObject({ verified: false, verification: null });
    expect((await call('GET', '/auth/me', s.leader)).data.user.leaderVerified).toBe(false);
  });

  test('o pedido exige os dados da igreja e os dois documentos', async () => {
    const noCity = await submit(s.leader, { ...FIELDS, city: '' }, { identity: { data: s.png, type: 'image/png' }, leadership: { data: PDF, type: 'application/pdf' } });
    expect(noCity.status).toBe(400);
    expect(noCity.message).toMatch(/cidade/);

    const oneDocument = await submit(s.leader, FIELDS, { identity: { data: s.png, type: 'image/png' } });
    expect(oneDocument.status).toBe(400);

    const disguised = await submit(s.leader, FIELDS, { identity: { data: Buffer.from('<script>alert(1)</script>'), type: 'image/png' }, leadership: { data: PDF, type: 'application/pdf' } });
    expect(disguised.status).toBe(400);
  });

  test('pedido completo fica em análise e avisa o administrador', async () => {
    const res = await submit(s.leader, FIELDS, { identity: { data: s.png, type: 'image/png' }, leadership: { data: PDF, type: 'application/pdf' } });
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('pending');
    expect(res.data.documents.map((d) => d.mimeType).sort()).toEqual(['application/pdf', 'image/webp']);
    s.verificationId = res.data.id;
    s.documents = res.data.documents;

    const again = await submit(s.leader, FIELDS, { identity: { data: s.png, type: 'image/png' }, leadership: { data: PDF, type: 'application/pdf' } });
    expect(again.status).toBe(409);

    const notifications = await call('GET', '/notifications', s.admin);
    expect(notifications.data.notifications.some((n) => n.type === 'leader_verification')).toBe(true);
  });

  test('os documentos só abrem para o próprio líder e para o administrador', async () => {
    const [first] = s.documents;
    const get = (token) => fetch(`${BASE}/leader-verification/documents/${first.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const mine = await get(s.leader);
    expect(mine.status).toBe(200);
    expect(mine.headers.get('content-type')).toBe(first.mimeType);
    expect(mine.headers.get('cache-control')).toMatch(/no-store/);
    expect((await get(s.admin)).status).toBe(200);
    expect((await get(s.other)).status).toBe(404);
    expect((await get(null)).status).toBe(401);
  });

  test('só o administrador decide; a recusa leva motivo e o líder pode enviar de novo', async () => {
    expect((await call('PATCH', `/leader-verification/${s.verificationId}`, s.leader, { status: 'approved' })).status).toBe(403);
    expect((await call('GET', '/leader-verification', s.other)).status).toBe(403);

    const pending = await call('GET', '/leader-verification?status=pending', s.admin);
    expect(pending.data.map((v) => v.id)).toContain(s.verificationId);

    expect((await call('PATCH', `/leader-verification/${s.verificationId}`, s.admin, { status: 'rejected' })).status).toBe(400);
    const rejected = await call('PATCH', `/leader-verification/${s.verificationId}`, s.admin, { status: 'rejected', reason: 'A carta da igreja está ilegível' });
    expect(rejected.data.status).toBe('rejected');
    const me = await call('GET', '/leader-verification/me', s.leader);
    expect(me.data.verification).toMatchObject({ status: 'rejected', reason: 'A carta da igreja está ilegível' });

    const resubmitted = await submit(s.leader, FIELDS, { identity: { data: s.png, type: 'image/png' }, leadership: { data: PDF, type: 'application/pdf' } });
    expect(resubmitted.status).toBe(201);
    // Os documentos do pedido recusado saem com ele
    expect(await getPrismaClient().leaderDocument.count({ where: { id: { in: s.documents.map((d) => d.id) } } })).toBe(0);

    const approved = await call('PATCH', `/leader-verification/${resubmitted.data.id}`, s.admin, { status: 'approved' });
    expect(approved.data.status).toBe('approved');
    expect((await call('GET', '/leader-verification/me', s.leader)).data.verified).toBe(true);

    const church = await call('POST', '/churches', s.leader, { name: 'Comunidade Verificada' });
    expect(church.status).toBe(201);
    s.church = church.data.id;
    s.leader = church.session.token;
  });
});

describe('link de convite', () => {
  test('o adulto que se regista pelo link entra logo na comunidade', async () => {
    const invite = await call('GET', `/churches/${s.church}/invite`, s.leader);
    expect(invite.data.code).toMatch(/^[\w-]{12}$/);
    s.code = invite.data.code;

    const info = await call('GET', `/invites/${s.code}`);
    expect(info.data.church.name).toBe('Comunidade Verificada');

    const res = await call('POST', `/invites/${s.code}/register`, null, {
      name: 'Fiel Convidado', email: `fiel${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234', birthDate: birthYears(25),
    });
    expect(res.status).toBe(201);
    expect(res.data.token).toBeTruthy();
    expect(res.data.user).toMatchObject({ role: 'member', churchId: s.church, status: 'active' });
    expect(await login(`fiel${stamp}@t.com`)).toBeTruthy();

    const notifications = await call('GET', '/notifications', s.leader);
    expect(notifications.data.notifications.some((n) => n.type === 'member_joined')).toBe(true);
  });

  test('menores não se registam pelo link e um link novo anula o antigo', async () => {
    const minor = await call('POST', `/invites/${s.code}/register`, null, {
      name: 'Menor', email: `menor${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234', birthDate: birthYears(15),
      guardian: { name: 'Mãe', email: `mae${stamp}@t.com`, password: 'Senha1234', relationship: 'mae' },
    });
    expect(minor.status).toBe(400);
    expect(minor.message).toMatch(/cadastrados pelo líder/);

    const member = await login(`fiel${stamp}@t.com`);
    expect((await call('GET', `/churches/${s.church}/invite`, member)).status).toBe(403);

    const fresh = await call('POST', `/churches/${s.church}/invite`, s.leader);
    expect(fresh.data.code).not.toBe(s.code);
    expect((await call('GET', `/invites/${s.code}`)).status).toBe(404);
    expect((await call('GET', '/invites/nao-existe-este')).status).toBe(404);
  });
});

describe('administração', () => {
  test('só o administrador abre a visão geral', async () => {
    expect((await call('GET', '/admin/overview', s.leader)).status).toBe(403);
    expect((await call('GET', '/admin/overview')).status).toBe(401);

    const res = await call('GET', '/admin/overview', s.admin);
    expect(res.status).toBe(200);
    expect(res.data.counts.people).toBeGreaterThanOrEqual(3);
    expect(res.data.counts.churches).toBeGreaterThanOrEqual(1);
    expect(res.data.counts.verifiedLeaders).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.data.pending)).toBe(true);
    expect(res.data.recent[0]).not.toHaveProperty('password');
  });

  test('busca de pessoas sem distinguir maiúsculas, e comunidades com líder e membros', async () => {
    const found = await call('GET', `/admin/users?q=LV${stamp}`, s.admin);
    expect(found.data.total).toBe(1);
    expect(found.data.users[0]).toMatchObject({ email: `lv${stamp}@t.com`, role: 'leader' });
    expect(found.data.users[0]).not.toHaveProperty('password');

    const churches = await call('GET', '/admin/churches', s.admin);
    const mine = churches.data.find((c) => c.id === s.church);
    expect(mine).toMatchObject({ name: 'Comunidade Verificada', leader: { name: 'Líder Novo' } });
    expect(mine.members).toBeGreaterThanOrEqual(1);
  });

  test('a plataforma tem um único administrador', async () => {
    const res = await call('POST', '/users', s.admin, { name: 'Outro Admin', email: `adm2${stamp}@t.com`, password: 'Senha1234', role: 'admin' });
    expect(res.status).toBe(403);
    expect(res.message).toMatch(/único administrador/);
  });
  test('o administrador é avisado dos líderes novos, dos pedidos e das decisões', async () => {
    await call('POST', '/auth/register', null, {
      name: 'Líder Tardio', email: `lt${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
    });
    const types = (await call('GET', '/notifications', s.admin)).data.notifications.map((n) => n.type);
    expect(types).toEqual(expect.arrayContaining(['leader_signup', 'leader_verification', 'verification_reviewed']));
  });

  test('o administrador envia mensagens e mexe na conta de um líder', async () => {
    const id = s.leaderId;
    expect((await call('POST', `/admin/users/${id}/message`, s.admin, { text: '   ' })).status).toBe(400);
    expect((await call('POST', `/admin/users/${id}/message`, s.leader, { text: 'Olá' })).status).toBe(403);
    expect((await call('POST', `/admin/users/${id}/message`, s.admin, { text: 'Retire a publicação ofensiva, por favor.' })).status).toBe(201);
    const inbox = (await call('GET', '/notifications', s.leader)).data.notifications;
    expect(inbox.find((n) => n.type === 'admin_message').body).toBe('Retire a publicação ofensiva, por favor.');

    const suspended = await call('POST', `/admin/users/${id}/moderation`, s.admin, { action: 'suspend', days: 7, reason: 'Conteúdo impróprio' });
    expect(suspended.data.status).toBe('suspended');
    const refused = await call('GET', '/notifications', s.leader);
    expect(refused.status).toBe(403);
    expect(refused.message).toMatch(/suspensa até .* Motivo: Conteúdo impróprio/);

    expect((await call('POST', `/admin/users/${id}/moderation`, s.admin, { action: 'reactivate' })).data.status).toBe('active');
    expect((await call('GET', '/notifications', s.leader)).status).toBe(200);

    expect((await call('POST', `/admin/users/${id}/moderation`, s.admin, { action: 'revoke_verification' })).status).toBe(400);
    const revoked = await call('POST', `/admin/users/${id}/moderation`, s.admin, { action: 'revoke_verification', reason: 'Documentos falsos' });
    expect(revoked.data.leaderVerifiedAt).toBeNull();
    expect((await call('GET', '/leader-verification/me', s.leader)).data).toMatchObject({
      verified: false, verification: { status: 'rejected', reason: 'Documentos falsos' },
    });

    const admin = (await call('GET', `/admin/users?q=adm${stamp}`, s.admin)).data.users[0];
    expect((await call('POST', `/admin/users/${admin.id}/moderation`, s.admin, { action: 'block' })).status).toBe(403);
  });
});
