// Fluxo completo da API (funcionalidades e permissões), contra uma base de dados temporária.
// Cada verificação falhada aparece listada no fim.
const App = require('../../src/app');
const { disconnectPrisma } = require('../../src/config/database');

let server;
let BASE;
const stamp = Date.now();
let pass = 0;
let fail = 0;
const failures = [];

const check = (name, cond, detail) => {
  if (cond) { pass++; return; }
  fail++;
  failures.push(`${name}${detail !== undefined ? ` → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
};

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

const register = (name, email, extra = {}) =>
  call('POST', '/auth/register', null, { name, email, password: 'Senha1234', confirmPassword: 'Senha1234', ...extra });

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}/api`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

test('fluxo completo: autenticação, comunidades, conteúdo, notificações e permissões', async () => {
    // ── AUTH ────────────────────────────────────────────────────
    const weak = await register('Fraco', `fraco${stamp}@t.com`, { password: '123456', confirmPassword: '123456' });
    check('registro com senha fraca → 400 em português', weak.status === 400 && /senha/i.test(weak.message), weak);

    const sneaky = await register('Sneaky', `sneaky${stamp}@t.com`, { role: 'admin' });
    check('registro público ignora role admin', sneaky.status === 201 && sneaky.data.user.role === 'leader', sneaky.data?.user);

    const leaderA = await register('Líder A', `lidera${stamp}@t.com`);
    const tokA = leaderA.data.token;
    check('registro do líder A', leaderA.status === 201 && !leaderA.data.user.churchId, leaderA);

    const badLogin = await call('POST', '/auth/login', null, { email: `lidera${stamp}@t.com`, password: 'errada' });
    check('login inválido → 401 em português', badLogin.status === 401 && /inválidos/.test(badLogin.message), badLogin);

    const noTok = await call('GET', '/posts');
    check('sem token → 401', noTok.status === 401, noTok);

    // ── CENÁRIO DO BUG: criar comunidade e publicar com o mesmo token ─
    const noChurchPost = await call('POST', '/posts', tokA, { content: 'Antes da comunidade' });
    check('publicar sem comunidade → mensagem clara', noChurchPost.status === 400 && /comunidade/.test(noChurchPost.message), noChurchPost);
    const emptyFeed = await call('GET', '/posts', tokA);
    check('feed sem comunidade → lista vazia (sem vazar outras igrejas)', emptyFeed.status === 200 && emptyFeed.data.length === 0, emptyFeed.data?.length);

    const churchA = await call('POST', '/churches', tokA, { name: 'Comunidade A', title: 'Igreja A', cultosDias: ['domingo', 'quarta'] });
    check('criar comunidade A', churchA.status === 201 && churchA.data.isActive && churchA.session?.token, churchA);
    const cA = churchA.data.id;

    const post1 = await call('POST', '/posts', tokA, { content: 'Primeira publicação da comunidade A' });
    check('BUG CORRIGIDO: publicar com o token antigo após criar comunidade', post1.status === 201, post1);

    const me = await call('GET', '/auth/me', tokA);
    check('/auth/me devolve churchId atualizado e novo token', me.status === 200 && me.data.user.churchId === cA && me.data.token, me.data?.user);

    const badDay = await call('POST', '/churches', tokA, { name: 'X', cultosDias: ['feriado'] });
    check('comunidade inválida → 400', badDay.status === 400, badDay);

    // ── MEMBROS ─────────────────────────────────────────────────
    const m1 = await call('POST', '/auth/register-member', tokA, {
      name: 'Membro Um', email: `m1${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234', churchId: cA, title: 'Músico',
    });
    check('líder cadastra membro', m1.status === 201 && m1.data.user.churchId === cA && !m1.data.token, m1);
    const l1 = await call('POST', '/auth/login', null, { email: `m1${stamp}@t.com`, password: 'Senha1234' });
    const tokM1 = l1.data.token;
    const m1Id = l1.data.user.id;

    const m2 = await call('POST', '/auth/register-member', tokA, {
      name: 'Membro Dois', email: `m2${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234', churchId: cA,
    });
    const tokM2 = (await call('POST', '/auth/login', null, { email: `m2${stamp}@t.com`, password: 'Senha1234' })).data.token;
    const m2Id = m2.data.user.id;

    const memberRegisters = await call('POST', '/auth/register-member', tokM1, {
      name: 'Intruso', email: `x${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234', churchId: cA,
    });
    check('membro não pode cadastrar membros → 403', memberRegisters.status === 403, memberRegisters);

    const leaderB = await register('Líder B', `liderb${stamp}@t.com`);
    const tokB = leaderB.data.token;
    const churchB = await call('POST', '/churches', tokB, { name: 'Comunidade B' });
    const cB = churchB.data.id;

    const crossRegister = await call('POST', '/auth/register-member', tokB, {
      name: 'Outro', email: `o${stamp}@t.com`, password: 'Senha1234', confirmPassword: 'Senha1234', churchId: cA,
    });
    check('líder B não cadastra na comunidade A → 403', crossRegister.status === 403, crossRegister);

    const crossChurch = await call('GET', `/churches/${cA}`, tokB);
    check('líder B não vê a comunidade A → 404', crossChurch.status === 404, crossChurch);
    const crossMembers = await call('GET', `/churches/${cA}/members`, tokB);
    check('líder B não lista membros de A → 404', crossMembers.status === 404, crossMembers);
    const crossDelete = await call('DELETE', `/churches/${cA}`, tokB);
    check('líder B não exclui A (sem erro 500)', crossDelete.status === 403 || crossDelete.status === 404, crossDelete);

    const members = await call('GET', `/churches/${cA}/members`, tokM1);
    check('membro lista membros da própria comunidade', members.status === 200 && members.data.length === 3, members.data?.length);

    const editMember = await call('PUT', `/churches/${cA}/members/${m1Id}`, tokA, { title: '', location: 'Maputo', age: 25 });
    check('editar membro (limpa cargo)', editMember.status === 200 && editMember.data.title === null && editMember.data.location === 'Maputo', editMember.data);

    const users = await call('GET', '/users', tokM1);
    check('lista de usuários com foto/cargo/local', users.status === 200 && users.data.length === 3 && 'location' in users.data[0], users.data?.[0]);

    const blocked = await call('GET', '/users/blocked', tokM1);
    check('GET /users/blocked deixa de cair em /:id', blocked.status === 200 && Array.isArray(blocked.data), blocked);

    const profile = await call('GET', `/users/${m1Id}`, tokA);
    check('perfil completo (skills, redes, local)', profile.status === 200 && Array.isArray(profile.data.skills) && profile.data.location === 'Maputo', profile.data);

    const crossProfile = await call('GET', `/users/${m1Id}`, tokB);
    check('perfil de outra comunidade → 404', crossProfile.status === 404, crossProfile);

    const upd = await call('PUT', '/users/profile', tokM1, { bio: 'Toco guitarra', skills: ['Música', 'Música', 'Som'], socialLinks: [{ platform: 'instagram', url: 'https://instagram.com/m1' }] });
    check('atualizar perfil (skills sem repetição, redes)', upd.status === 200 && upd.data.skills.length === 2 && upd.data.socialLinks.length === 1, upd.data);
    const clearBio = await call('PUT', '/users/profile', tokM1, { bio: '' });
    check('limpar bio', clearBio.status === 200 && clearBio.data.bio === null && clearBio.data.skills.length === 2, clearBio.data);

    const createAdmin = await call('POST', '/users', tokA, { name: 'Novo Admin', email: `adm${stamp}@t.com`, password: 'Senha1234', role: 'admin' });
    check('líder não cria admin → 403', createAdmin.status === 403, createAdmin);
    const createLeader = await call('POST', '/users', tokA, { name: 'Co-líder', email: `col${stamp}@t.com`, password: 'Senha1234', role: 'leader' });
    check('líder cria co-líder na sua comunidade', createLeader.status === 201 && createLeader.data.churchId === cA, createLeader);

    // ── POSTS ───────────────────────────────────────────────────
    const emptyPost = await call('POST', '/posts', tokM1, { content: '   ' });
    check('post vazio → 400', emptyPost.status === 400, emptyPost);
    const p2 = await call('POST', '/posts', tokM1, { content: 'Ok' });
    check('post curto (2 letras) é aceite', p2.status === 201, p2);
    const pid = post1.data.id;

    const comment = await call('POST', `/posts/${pid}/comment`, tokM1, { content: 'Amém!' });
    check('comentar', comment.status === 201 && comment.data.userName === 'Membro Um', comment);
    const badReact = await call('POST', `/posts/${pid}/react`, tokM1, { type: 'xyz' });
    check('reação inválida → 400', badReact.status === 400, badReact);
    const react = await call('POST', `/posts/${pid}/react`, tokM1, { type: 'amen' });
    check('reagir', react.status === 200, react);
    await call('POST', `/posts/${pid}/react`, tokM1, { type: 'heart' });

    const pinByMember = await call('PATCH', `/posts/${pid}/pin`, tokM1, { isPinned: true });
    check('membro não fixa → 403', pinByMember.status === 403, pinByMember);
    const pin = await call('PATCH', `/posts/${pid}/pin`, tokA, { isPinned: true });
    check('líder fixa', pin.status === 200, pin);

    const crossPost = await call('GET', `/posts/${pid}`, tokB);
    check('post de outra comunidade → 404', crossPost.status === 404, crossPost);
    const crossComment = await call('POST', `/posts/${pid}/comment`, tokB, { content: 'invasão' });
    check('comentar em outra comunidade → 404', crossComment.status === 404, crossComment);

    const delCommentOther = await call('DELETE', `/posts/${pid}/comments/${comment.data.id}`, tokM2);
    check('membro não apaga comentário alheio → 403', delCommentOther.status === 403, delCommentOther);
    const delComment = await call('DELETE', `/posts/${pid}/comments/${comment.data.id}`, tokM1);
    check('autor apaga o próprio comentário', delComment.status === 200, delComment);

    const delPostOther = await call('DELETE', `/posts/${p2.data.id}`, tokM2);
    check('membro não apaga post alheio → 403', delPostOther.status === 403, delPostOther);
    const delPostLeader = await call('DELETE', `/posts/${p2.data.id}`, tokA);
    check('líder apaga post de membro', delPostLeader.status === 200, delPostLeader);

    const feed = await call('GET', '/posts', tokM2);
    check('feed da comunidade', feed.status === 200 && feed.data.length === 1 && feed.data[0].isPinned && feed.data[0].reactions.amen === 1, feed.data);

    // bloqueio esconde conteúdo
    await call('POST', '/posts', tokM1, { content: 'Post do membro um para testar bloqueio' });
    const block = await call('POST', `/users/block/${m1Id}`, tokM2);
    check('bloquear', block.status === 200, block);
    const feedBlocked = await call('GET', '/posts', tokM2);
    check('posts de bloqueado ficam ocultos', feedBlocked.data.every((p) => p.userId !== m1Id), feedBlocked.data.map((p) => p.userName));
    const blockedProfile = await call('GET', `/users/${m1Id}`, tokM2);
    check('perfil indica isBlocked', blockedProfile.data?.isBlocked === true, blockedProfile.data);
    const unblock = await call('DELETE', `/users/block/${m1Id}`, tokM2);
    check('desbloquear', unblock.status === 200, unblock);

    // ── DEVOCIONAIS ─────────────────────────────────────────────
    const devByMember = await call('POST', '/devotionals', tokM1, { title: 'Teste', content: 'Conteúdo do devocional' });
    check('membro não publica devocional → 403', devByMember.status === 403, devByMember);
    const devShort = await call('POST', '/devotionals', tokA, { title: 'Fé', content: 'curto' });
    check('devocional inválido → 400', devShort.status === 400, devShort);
    const dev = await call('POST', '/devotionals', tokA, { title: 'Fé que move', verse: 'Hebreus 11:1', content: 'A fé é a certeza daquilo que esperamos.' });
    check('publicar devocional', dev.status === 201 && dev.data.isActive && dev.data.likeCount === 0, dev);
    const like = await call('POST', `/devotionals/${dev.data.id}/like`, tokM1);
    check('curtir devocional', like.status === 200 && like.data.liked && like.data.likeCount === 1, like);
    const devs = await call('GET', '/devotionals', tokM1);
    check('lista com likeCount/hasLiked', devs.data[0].likeCount === 1 && devs.data[0].hasLiked === true, devs.data[0]);
    const crossDev = await call('PUT', `/devotionals/${dev.data.id}/inactive`, tokB);
    check('outro líder não desativa → 404', crossDev.status === 404, crossDev);
    const inactive = await call('PUT', `/devotionals/${dev.data.id}/inactive`, tokA);
    check('desativar', inactive.status === 200 && inactive.data.isActive === false, inactive.data);

    // ── EVENTOS ─────────────────────────────────────────────────
    const evByMember = await call('POST', '/events', tokM1, { title: 'Festa', startDate: '2030-01-01T19:00' });
    check('membro não cria evento → 403', evByMember.status === 403, evByMember);
    const evBad = await call('POST', '/events', tokA, { title: 'Culto', startDate: 'amanhã' });
    check('data inválida → 400', evBad.status === 400, evBad);
    const evOrder = await call('POST', '/events', tokA, { title: 'Culto', startDate: '2030-01-02T19:00', endDate: '2030-01-02T18:00' });
    check('término antes do início → 400', evOrder.status === 400, evOrder);
    const ev = await call('POST', '/events', tokA, { title: 'Culto de Jovens', startDate: '2030-01-02T19:00', location: 'Templo' });
    check('criar evento (datetime-local)', ev.status === 201 && ev.data.goingCount === 0, ev);
    const evUpd = await call('PUT', `/events/${ev.data.id}`, tokA, { location: 'Salão', churchId: cB, createdBy: m1Id });
    check('editar evento só com campos permitidos', evUpd.status === 200 && evUpd.data.location === 'Salão' && evUpd.data.createdBy === leaderA.data.user.id, evUpd.data);
    const rsvpBad = await call('POST', `/events/${ev.data.id}/rsvp`, tokM1, { status: 'talvez' });
    check('RSVP inválido → 400', rsvpBad.status === 400, rsvpBad);
    const rsvp = await call('POST', `/events/${ev.data.id}/rsvp`, tokM1, { status: 'going' });
    check('RSVP confirma presença', rsvp.status === 200 && rsvp.data.goingCount === 1 && rsvp.data.myStatus === 'going', rsvp.data);
    const evDelM = await call('DELETE', `/events/${ev.data.id}`, tokM1);
    check('membro não exclui evento → 403 (sem erro 500)', evDelM.status === 403, evDelM);

    // ── ORAÇÕES ─────────────────────────────────────────────────
    const prBad = await call('POST', '/prayers', tokM1, { title: 'a', content: 'b' });
    check('pedido inválido → 400', prBad.status === 400, prBad);
    const pr = await call('POST', '/prayers', tokM1, { title: 'Saúde da família', content: 'Orem pela recuperação da minha mãe.' });
    check('pedido com nome do autor', pr.status === 201 && pr.data.authorName === 'Membro Um' && pr.data.isMine, pr.data);
    const anon = await call('POST', '/prayers', tokM1, { title: 'Pedido reservado', content: 'Orem por uma decisão importante.', isAnonymous: true });
    const prList = await call('GET', '/prayers', tokM2);
    const anonSeen = prList.data.find((p) => p.id === anon.data.id);
    check('anónimo esconde o autor para os outros', anonSeen && anonSeen.authorName === null && anonSeen.userId === null && !anonSeen.isMine, anonSeen);
    const anonMine = (await call('GET', '/prayers', tokM1)).data.find((p) => p.id === anon.data.id);
    check('autor reconhece o pedido anónimo (isMine)', anonMine?.isMine === true, anonMine);
    const pray = await call('POST', `/prayers/${pr.data.id}/pray`, tokM2);
    check('orar', pray.status === 200 && pray.data.prayCount === 1 && pray.data.hasPrayed, pray.data);
    const answeredByOther = await call('PATCH', `/prayers/${pr.data.id}/answered`, tokM2);
    check('outro membro não marca respondido → 403 (sem erro 500)', answeredByOther.status === 403, answeredByOther);
    const answered = await call('PATCH', `/prayers/${pr.data.id}/answered`, tokM1);
    check('autor marca respondido', answered.status === 200 && answered.data.isAnswered, answered.data);

    // ── ENQUETES ────────────────────────────────────────────────
    const pollMember = await call('POST', '/polls', tokM1, { question: 'Qual dia?', options: ['Sáb', 'Dom'] });
    check('membro não cria enquete → 403', pollMember.status === 403, pollMember);
    const pollBad = await call('POST', '/polls', tokA, { question: 'Qual dia é melhor?', options: ['Sábado'] });
    check('enquete com 1 opção → 400 (sem erro 500)', pollBad.status === 400, pollBad);
    const pollNoOpts = await call('POST', '/polls', tokA, { question: 'Qual dia é melhor?' });
    check('enquete sem opções → 400 (antes dava 500)', pollNoOpts.status === 400, pollNoOpts);
    const poll = await call('POST', '/polls', tokA, { question: 'Qual dia é melhor para o ensaio?', options: ['Sábado', 'Domingo', 'Quarta'] });
    check('criar enquete', poll.status === 201 && poll.data.options.length === 3, poll);
    const v1 = await call('POST', `/polls/${poll.data.id}/vote`, tokM1, { optionId: poll.data.options[0].id });
    const v2 = await call('POST', `/polls/${poll.data.id}/vote`, tokM1, { optionId: poll.data.options[1].id });
    check('trocar voto mantém um único voto', v1.status === 200 && v2.data.totalVotes === 1 && v2.data.myVoteOptionId === poll.data.options[1].id, v2.data);
    const voteBad = await call('POST', `/polls/${poll.data.id}/vote`, tokM1, { optionId: 'nada' });
    check('opção inválida → 400', voteBad.status === 400, voteBad);

    // ── CHAT ────────────────────────────────────────────────────
    const msgEmpty = await call('POST', '/chat/messages', tokM1, { content: ' ' });
    check('mensagem vazia → 400 com "message"', msgEmpty.status === 400 && msgEmpty.message, msgEmpty);
    const msg = await call('POST', '/chat/messages', tokM1, { content: 'Olá, pessoal!' });
    check('enviar mensagem', msg.status === 201, msg);
    const msgs = await call('GET', '/chat/messages?limit=10', tokM2);
    check('ler mensagens', msgs.status === 200 && msgs.data.some((m) => m.id === msg.data.id), msgs.count);
    const msgDelOther = await call('DELETE', `/chat/messages/${msg.data.id}`, tokM2);
    check('membro não apaga mensagem alheia → 403', msgDelOther.status === 403, msgDelOther);
    const msgDelLeader = await call('DELETE', `/chat/messages/${msg.data.id}`, tokA);
    check('líder modera (apaga) mensagem', msgDelLeader.status === 200, msgDelLeader);
    const msgsB = await call('GET', '/chat/messages', tokB);
    check('chat isolado por comunidade', msgsB.data.every((m) => m.churchId === cB), msgsB.data.length);

    // ── PREGAÇÕES ───────────────────────────────────────────────
    const serBad = await call('POST', '/sermons', tokA, { title: 'X' });
    check('pregação inválida → 400', serBad.status === 400, serBad);
    const ser = await call('POST', '/sermons', tokA, { title: 'O Bom Pastor', speaker: 'Pr. João', content: 'Anotações sobre o Salmo 23 e o cuidado de Deus.', scriptureRef: 'Salmos 23' });
    check('publicar pregação', ser.status === 201 && ser.data.author?.name === 'Líder A', ser);
    const serUpd = await call('PUT', `/sermons/${ser.data.id}`, tokA, { scriptureRef: '' });
    check('editar pregação (limpa referência)', serUpd.status === 200 && serUpd.data.scriptureRef === null, serUpd.data);
    const serCross = await call('GET', `/sermons/${ser.data.id}`, tokB);
    check('pregação de outra comunidade → 404', serCross.status === 404, serCross);

    // ── GRUPOS ──────────────────────────────────────────────────
    const grpBad = await call('POST', '/groups', tokA, { name: 'Louvor', category: 'banda' });
    check('categoria inválida → 400', grpBad.status === 400, grpBad);
    const grp = await call('POST', '/groups', tokA, { name: 'Equipa de Louvor', category: 'louvor' });
    check('criar grupo (líder já é membro)', grp.status === 201 && grp.data.memberCount === 1 && grp.data.isLeader, grp.data);
    const join = await call('POST', `/groups/${grp.data.id}/join`, tokM1);
    check('entrar no grupo', join.status === 200 && join.data.memberCount === 2 && join.data.isMember, join.data);
    const joinAgain = await call('POST', `/groups/${grp.data.id}/join`, tokM1);
    check('entrar de novo → 409', joinAgain.status === 409, joinAgain);
    const leaderLeave = await call('POST', `/groups/${grp.data.id}/leave`, tokA);
    check('líder do grupo não sai → 400', leaderLeave.status === 400, leaderLeave);
    const leave = await call('POST', `/groups/${grp.data.id}/leave`, tokM1);
    check('sair do grupo', leave.status === 200 && leave.data.memberCount === 1, leave.data);

    // ── NOTIFICAÇÕES ────────────────────────────────────────────
    const nA = await call('GET', '/notifications', tokA);
    const typesA = nA.data.notifications.map((n) => n.type);
    check('líder recebe comentário/reação/entrada no grupo', ['new_comment', 'reaction', 'group_join'].every((t) => typesA.includes(t)), typesA);
    const nM2 = await call('GET', '/notifications', tokM2);
    const typesM2 = nM2.data.notifications.map((n) => n.type);
    check('membro recebe post/evento/devocional/enquete/pregação/grupo', ['new_post', 'new_event', 'new_devotional', 'poll_created', 'new_sermon', 'new_group'].every((t) => typesM2.includes(t)), typesM2);
    check('oração respondida notifica quem orou', typesM2.includes('prayer_answered'), typesM2);
    const nM1 = await call('GET', '/notifications', tokM1);
    check('autor do pedido recebe "orando por você"', nM1.data.notifications.some((n) => n.type === 'praying'), nM1.data.notifications.map((n) => n.type));
    const readAll = await call('PATCH', '/notifications/read-all', tokM2);
    const nM2b = await call('GET', '/notifications', tokM2);
    check('marcar todas lidas', readAll.status === 200 && nM2b.data.unreadCount === 0, nM2b.data.unreadCount);

    // ── RELATÓRIOS / BUSCA / COMUNIDADES ────────────────────────
    const stats = await call('GET', `/churches/${cA}/member-stats`, tokA);
    check('estatísticas ordenadas por engajamento', stats.status === 200 && stats.data[0].total >= stats.data[stats.data.length - 1].total, stats.data);
    const search = await call('GET', '/search?q=Membro', tokA);
    check('busca encontra membros', search.status === 200 && search.data.members.length >= 2, search.data);

    const second = await call('POST', '/churches', tokA, { name: 'Comunidade A2' });
    const mine = await call('GET', '/churches/leader/my-churches', tokA);
    check('nova comunidade fica ativa', mine.data.find((c) => c.id === second.data.id)?.isActive === true, mine.data.map((c) => [c.name, c.isActive]));
    const activate = await call('POST', `/churches/${cA}/activate`, tokA);
    check('voltar a ativar a comunidade A', activate.status === 200 && activate.session.user.churchId === cA, activate);
    const activateOther = await call('POST', `/churches/${cB}/activate`, tokA);
    check('não ativa comunidade de outro líder → 403', activateOther.status === 403, activateOther);
    const updChurch = await call('PUT', `/churches/${cA}`, tokA, { description: 'Jovens da Igreja A', title: '' });
    check('editar comunidade (limpa título)', updChurch.status === 200 && updChurch.data.description === 'Jovens da Igreja A' && updChurch.data.title === null, updChurch.data);
    const delSecond = await call('DELETE', `/churches/${second.data.id}`, tokA);
    check('excluir comunidade', delSecond.status === 200, delSecond);
    const removeCreator = await call('DELETE', `/churches/${cA}/members/${leaderA.data.user.id}`, tokA);
    check('não remove o criador → 400', removeCreator.status === 400, removeCreator);
    const removeM2 = await call('DELETE', `/churches/${cA}/members/${m2Id}`, tokA);
    check('remover membro', removeM2.status === 200, removeM2);
    const m2After = await call('GET', '/posts', tokM2);
    check('membro removido deixa de ver o feed', m2After.status === 200 && m2After.data.length === 0, m2After.data?.length);

  expect(failures).toEqual([]);
  expect(pass).toBeGreaterThanOrEqual(100);
});
