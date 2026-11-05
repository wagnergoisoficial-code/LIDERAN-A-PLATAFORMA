// Secção 6 (Segurança): chat privado, proteção de menores, responsáveis, denúncias e moderação.
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

const login = async (email, password = 'Senha1234') => (await call('POST', '/auth/login', null, { email, password }));

// Estado partilhado pelos testes, por ordem
const s = {};
const birthYears = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api`;

  const leader = await call('POST', '/auth/register', null, {
    name: 'Líder Proteção', email: `lp${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
  });
  s.leader = leader.data.token;
  s.leaderId = leader.data.user.id;
  await getPrismaClient().user.update({ where: { id: s.leaderId }, data: { leaderVerifiedAt: new Date() } });
  s.church = (await call('POST', '/churches', s.leader, { name: 'Comunidade Protegida' })).data.id;

  const adult = await call('POST', '/auth/register-member', s.leader, {
    name: 'Adulto', email: `ad${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
    birthDate: birthYears(30), churchId: s.church,
  });
  s.adultId = adult.data.user.id;
  s.adult = (await login(`ad${stamp}@t.com`)).data.token;

  const adult2 = await call('POST', '/auth/register-member', s.leader, {
    name: 'Outro Adulto', email: `ad2${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
    birthDate: birthYears(25), churchId: s.church,
  });
  s.adult2Id = adult2.data.user.id;
  s.adult2 = (await login(`ad2${stamp}@t.com`)).data.token;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

describe('cadastro de menor exige autorização dos pais', () => {
  test('menor sem responsável é recusado', async () => {
    const res = await call('POST', '/auth/register-member', s.leader, {
      name: 'Menor Sem Pais', email: `ms${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
      birthDate: birthYears(14), churchId: s.church,
    });
    expect(res.status).toBe(400);
    expect(res.message).toMatch(/responsável/);
  });

  test('menor com responsável fica à espera da autorização', async () => {
    const res = await call('POST', '/auth/register-member', s.leader, {
      name: 'Menor', email: `mn${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
      birthDate: birthYears(14), churchId: s.church,
      guardian: { name: 'Mãe do Menor', email: `mae${stamp}@t.com`, password: 'Senha1234', relationship: 'mae' },
    });
    expect(res.status).toBe(201);
    expect(res.data.pendingAuthorization).toBe(true);
    expect(res.data.guardian.created).toBe(true);
    s.minorId = res.data.user.id;

    const minorLogin = await login(`mn${stamp}@t.com`);
    expect(minorLogin.status).toBe(403);
    expect(minorLogin.code).toBe('ACCOUNT_RESTRICTED');
    expect(minorLogin.message).toMatch(/autorização/);
  });

  test('o e-mail de um membro não pode ser usado como conta de responsável', async () => {
    const res = await call('POST', '/auth/register-member', s.leader, {
      name: 'Menor Dois', email: `mn2${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
      birthDate: birthYears(12), churchId: s.church,
      guardian: { email: `ad${stamp}@t.com` },
    });
    expect(res.status).toBe(409);
  });

  test('membro comum não pode confirmar autorizações', async () => {
    const res = await call('POST', `/churches/${s.church}/members/${s.minorId}/authorize`, s.adult);
    expect(res.status).toBe(403);
  });

  test('o líder confirma a autorização e o menor passa a entrar', async () => {
    const res = await call('POST', `/churches/${s.church}/members/${s.minorId}/authorize`, s.leader);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('active');
    expect(res.data.guardians[0].authorizationMethod).toBe('leader_confirmation');
    s.minor = (await login(`mn${stamp}@t.com`)).data.token;
    expect(s.minor).toBeTruthy();
  });

  test('o responsável também pode autorizar pela app', async () => {
    const res = await call('POST', '/auth/register-member', s.leader, {
      name: 'Irmão Menor', email: `mn3${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234',
      birthDate: birthYears(10), churchId: s.church,
      guardian: { email: `mae${stamp}@t.com`, relationship: 'mae' },
    });
    expect(res.data.guardian.created).toBe(false);
    s.minor2Id = res.data.user.id;

    const guardianLogin = await login(`mae${stamp}@t.com`);
    expect(guardianLogin.data.user.role).toBe('guardian');
    s.guardian = guardianLogin.data.token;

    const approve = await call('POST', `/guardian/children/${s.minor2Id}/authorize`, s.guardian);
    expect(approve.status).toBe(200);
    expect((await login(`mn3${stamp}@t.com`)).status).toBe(200);
  });
});

describe('chat privado', () => {
  test('adulto e menor conversam; a conversa fica protegida', async () => {
    const conv = await call('POST', '/conversations', s.adult, { userId: s.minorId });
    expect(conv.status).toBe(201);
    expect(conv.data.protected).toBe(true);
    s.protectedConv = conv.data.id;

    const sent = await call('POST', `/conversations/${s.protectedConv}/messages`, s.adult, { content: 'Olá! Ensaio amanhã às 15h.' });
    expect(sent.status).toBe(201);
    s.adultMsg = sent.data.id;
    expect((await call('POST', `/conversations/${s.protectedConv}/messages`, s.minor, { content: 'Combinado!' })).status).toBe(201);

    // Abrir de novo devolve a mesma conversa
    expect((await call('POST', '/conversations', s.minor, { userId: s.adultId })).data.id).toBe(s.protectedConv);
  });

  test('nas conversas com menores nada pode ser apagado', async () => {
    const del = await call('DELETE', `/conversations/${s.protectedConv}/messages/${s.adultMsg}`, s.adult);
    expect(del.status).toBe(403);
    expect(del.message).toMatch(/menor de idade/);
  });

  test('entre adultos cada um apaga as suas mensagens', async () => {
    const conv = await call('POST', '/conversations', s.adult, { userId: s.adult2Id });
    expect(conv.data.protected).toBe(false);
    const msg = await call('POST', `/conversations/${conv.data.id}/messages`, s.adult, { content: 'Mensagem a apagar' });
    expect((await call('DELETE', `/conversations/${conv.data.id}/messages/${msg.data.id}`, s.adult2)).status).toBe(403);
    expect((await call('DELETE', `/conversations/${conv.data.id}/messages/${msg.data.id}`, s.adult)).status).toBe(200);
    const list = await call('GET', `/conversations/${conv.data.id}/messages`, s.adult2);
    expect(list.data.messages.some((m) => m.id === msg.data.id)).toBe(false);
  });

  test('mensagens não lidas e quem não participa não lê', async () => {
    // Responder conta como ler: quem tem por ler é o adulto (a resposta "Combinado!")
    expect((await call('GET', '/conversations/unread', s.minor)).data.total).toBe(0);
    expect((await call('GET', '/conversations/unread', s.adult)).data.total).toBe(1);
    await call('POST', `/conversations/${s.protectedConv}/read`, s.adult);
    expect((await call('GET', '/conversations/unread', s.adult)).data.total).toBe(0);
    expect((await call('GET', `/conversations/${s.protectedConv}/messages`, s.adult2)).status).toBe(404);
  });
});

describe('responsável vê as conversas do filho', () => {
  test('lista os filhos e as conversas, em modo leitura', async () => {
    const children = await call('GET', '/guardian/children', s.guardian);
    expect(children.status).toBe(200);
    const child = children.data.find((c) => c.id === s.minorId);
    expect(child.conversations).toHaveLength(1);

    const conv = await call('GET', `/guardian/children/${s.minorId}/conversations/${s.protectedConv}`, s.guardian);
    expect(conv.data.messages.map((m) => m.content)).toEqual(['Olá! Ensaio amanhã às 15h.', 'Combinado!']);

    // Não pode escrever nem usar a área de membros
    expect((await call('POST', `/conversations/${s.protectedConv}/messages`, s.guardian, { content: 'x' })).status).toBe(404);
  });

  test('outros responsáveis e membros não têm acesso', async () => {
    expect((await call('GET', '/guardian/children', s.adult)).status).toBe(403);
    const other = await call('POST', `/churches/${s.church}/members/${s.minor2Id}/guardians`, s.leader, {
      name: 'Tio', email: `tio${stamp}@t.com`, password: 'Senha1234', relationship: 'tutor',
    });
    expect(other.status).toBe(201);
    const uncle = (await login(`tio${stamp}@t.com`)).data.token;
    expect((await call('GET', `/guardian/children/${s.minorId}/conversations/${s.protectedConv}`, uncle)).status).toBe(404);
  });
});

describe('chat da comunidade com menores', () => {
  test('ninguém apaga as próprias mensagens; o líder pode ocultar', async () => {
    const msg = await call('POST', '/chat/messages', s.adult, { content: 'Mensagem no chat' });
    const list = await call('GET', '/chat/messages', s.adult);
    expect(list.protected).toBe(true);

    expect((await call('DELETE', `/chat/messages/${msg.data.id}`, s.adult)).status).toBe(403);
    expect((await call('DELETE', `/chat/messages/${msg.data.id}`, s.leader)).status).toBe(200);
    const after = await call('GET', '/chat/messages', s.adult);
    expect(after.data.some((m) => m.id === msg.data.id)).toBe(false);

    const hidden = await getPrismaClient().message.findUnique({ where: { id: msg.data.id } });
    expect(hidden.content).toBe('Mensagem no chat');
    expect(hidden.hiddenAt).not.toBeNull();
  });
});

describe('denúncias', () => {
  test('o menor denuncia o perfil e o líder recebe o histórico da conversa', async () => {
    const report = await call('POST', '/reports', s.minor, { targetType: 'profile', targetId: s.adultId });
    expect(report.status).toBe(201);
    s.reportId = report.data.id;

    const again = await call('POST', '/reports', s.minor, { targetType: 'profile', targetId: s.adultId });
    expect(again.status).toBe(200);
    expect(again.data.duplicate).toBe(true);

    const notifications = await call('GET', '/notifications', s.leader);
    expect(notifications.data.notifications.filter((n) => n.type === 'report')).toHaveLength(1);

    const detail = await call('GET', `/reports/${s.reportId}`, s.leader);
    expect(detail.data.targetUser.id).toBe(s.adultId);
    expect(detail.data.snapshot.conversation.messages).toHaveLength(2);
    expect(detail.data.snapshot.user.name).toBe('Adulto');
  });

  test('denunciar conversa e publicação guarda o conteúdo', async () => {
    const conv = await call('POST', '/reports', s.adult2, { targetType: 'conversation', targetId: s.protectedConv });
    expect(conv.status).toBe(404); // só quem participa pode denunciar a conversa

    const post = await call('POST', '/posts', s.adult, { content: 'Publicação denunciada' });
    const rp = await call('POST', '/reports', s.adult2, { targetType: 'post', targetId: post.data.id, details: 'Conteúdo impróprio' });
    expect(rp.status).toBe(201);
    const detail = await call('GET', `/reports/${rp.data.id}`, s.leader);
    expect(detail.data.snapshot.post.content).toBe('Publicação denunciada');
    expect(detail.data.details).toBe('Conteúdo impróprio');
  });

  test('só os líderes veem as denúncias; não se denuncia o próprio perfil', async () => {
    expect((await call('GET', '/reports', s.adult)).status).toBe(403);
    const list = await call('GET', `/reports?churchId=${s.church}&status=open`, s.leader);
    expect(list.data.length).toBe(2);
    expect((await call('GET', `/reports/count?churchId=${s.church}`, s.leader)).data.open).toBe(2);
    expect((await call('POST', '/reports', s.adult, { targetType: 'profile', targetId: s.adultId })).status).toBe(400);
  });

  test('o responsável denuncia uma conversa do filho, e só essa', async () => {
    const res = await call('POST', '/reports', s.guardian, { targetType: 'conversation', targetId: s.protectedConv, details: 'Visto pela mãe' });
    expect(res.status).toBe(201);
    const detail = await call('GET', `/reports/${res.data.id}`, s.leader);
    expect(detail.data.reporter.role).toBe('guardian');
    expect(detail.data.targetUser.id).toBe(s.adultId);
    expect(detail.data.snapshot.messages).toHaveLength(2);

    expect((await call('POST', '/reports', s.guardian, { targetType: 'profile', targetId: s.adultId })).status).toBe(403);
    const uncle = (await login(`tio${stamp}@t.com`)).data.token;
    expect((await call('POST', '/reports', uncle, { targetType: 'conversation', targetId: s.protectedConv })).status).toBe(404);
  });

  test('pedido de oração denunciado chega ao líder com o autor', async () => {
    const prayer = await call('POST', '/prayers', s.adult, { title: 'Pedido estranho', content: 'Conteúdo impróprio num pedido.' });
    const rp = await call('POST', '/reports', s.adult2, { targetType: 'prayer_request', targetId: prayer.data.id });
    expect(rp.status).toBe(201);
    const detail = await call('GET', `/reports/${rp.data.id}`, s.leader);
    expect(detail.data.targetUser.id).toBe(s.adultId);
    expect(detail.data.snapshot.prayer.author.name).toBe('Adulto');
  });
});

describe('líder suspende e bloqueia pelo painel', () => {
  test('suspensão a partir da denúncia corta o acesso de imediato', async () => {
    const res = await call('POST', `/churches/${s.church}/members/${s.adultId}/moderation`, s.leader, {
      action: 'suspend', days: 7, reason: 'Mensagens impróprias', reportId: s.reportId,
    });
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('suspended');

    const blocked = await call('GET', '/auth/me', s.adult);
    expect(blocked.status).toBe(403);
    expect(blocked.code).toBe('ACCOUNT_RESTRICTED');
    expect(blocked.message).toMatch(/suspensa até/);
    expect((await login(`ad${stamp}@t.com`)).status).toBe(403);

    const report = await call('GET', `/reports/${s.reportId}`, s.leader);
    expect(report.data.status).toBe('resolved');
  });

  test('a suspensão termina sozinha quando o prazo acaba', async () => {
    await getPrismaClient().user.update({ where: { id: s.adultId }, data: { suspendedUntil: new Date(Date.now() - 1000) } });
    expect((await call('GET', '/auth/me', s.adult)).status).toBe(200);
  });

  test('bloquear e reativar', async () => {
    expect((await call('POST', `/churches/${s.church}/members/${s.adultId}/moderation`, s.leader, { action: 'block' })).status).toBe(200);
    expect((await login(`ad${stamp}@t.com`)).message).toMatch(/bloqueada/);
    expect((await call('POST', `/churches/${s.church}/members/${s.adultId}/moderation`, s.leader, { action: 'reactivate' })).status).toBe(200);
    expect((await login(`ad${stamp}@t.com`)).status).toBe(200);
  });

  test('regras: membros não moderam, o líder não se suspende a si mesmo', async () => {
    expect((await call('POST', `/churches/${s.church}/members/${s.adult2Id}/moderation`, s.adult, { action: 'block' })).status).toBe(403);
    expect((await call('POST', `/churches/${s.church}/members/${s.leaderId}/moderation`, s.leader, { action: 'block' })).status).toBe(400);
    expect((await call('POST', `/churches/${s.church}/members/${s.adult2Id}/moderation`, s.leader, { action: 'suspend', days: 2 })).status).toBe(400);
  });

  test('a lista de membros mostra menores e responsáveis só ao líder', async () => {
    const forLeader = await call('GET', `/churches/${s.church}/members`, s.leader);
    const minor = forLeader.data.find((m) => m.id === s.minorId);
    expect(minor.isMinor).toBe(true);
    expect(minor.guardians[0].email).toBe(`mae${stamp}@t.com`);

    const forMember = await call('GET', `/churches/${s.church}/members`, s.adult2);
    const seen = forMember.data.find((m) => m.id === s.minorId);
    expect(seen.guardians).toBeUndefined();
    expect(seen.birthDate).toBeUndefined();
  });
});
