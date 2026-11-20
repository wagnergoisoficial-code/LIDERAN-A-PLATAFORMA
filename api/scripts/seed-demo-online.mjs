// Recria, pela API de um site já no ar, os dados de prisma/seed-demo.js na comunidade
// do líder de teste (leader@church.com). Serve para bases a que não há acesso direto,
// como a da Render. Só cria o que ainda não existe: pode correr de novo.
//   node scripts/seed-demo-online.mjs https://lidera-api.onrender.com/api
// O líder tem de existir antes: "Criar conta" no site com leader@church.com / Password123
// e depois "Nova Comunidade" no Painel.
// O conteúdo de contas que só existem no computador do Herminio (Herminio, Delio, Jonas,
// Membro Teste) fica de fora, como o próprio seed faz quando elas não existem.
const API = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/.+\/api$/.test(API)) {
  console.error('Indique a URL da API, ex.: https://lidera-api.onrender.com/api');
  process.exit(1);
}

const LEADER = { email: 'leader@church.com', password: 'Password123' };
const PASS = 'Demo@1234';
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const at = (daysFromNow, hour, minute = 0) => { const d = new Date(Date.now() + daysFromNow * DAY); d.setHours(hour, minute, 0, 0); return d; };
const ago = (days) => new Date(Date.now() - days * DAY);
const nextWeekday = (weekday, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7 || 7));
  d.setHours(hour, minute, 0, 0);
  return d;
};

const created = {};
const count = (what) => { created[what] = (created[what] || 0) + 1; };

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json.data, message: json.message };
}
async function must(method, path, token, body) {
  const r = await call(method, path, token, body);
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${r.message || ''}`);
  return r.data;
}
const list = (d) => (Array.isArray(d) ? d : Object.values(d || {}).filter(Array.isArray).flat());

// ── Líder e comunidade ─────────────────────────────────────────
const leaderLogin = await call('POST', '/auth/login', null, LEADER);
if (!leaderLogin.ok) throw new Error(`O líder ${LEADER.email} não entra: ${leaderLogin.message}`);
const L = leaderLogin.data.token;
const leader = leaderLogin.data.user;
const churchId = leader.churchId;
if (!churchId) throw new Error('O líder ainda não tem comunidade');

// ── Membros (adultos) ──────────────────────────────────────────
const MEMBERS = [
  { key: 'ana', name: 'Ana Machava', email: 'ana@lidera.test', title: 'Vocalista', location: 'Maputo', birthDate: '2004-02-18' },
  { key: 'lucas', name: 'Lucas Sitoe', email: 'lucas@lidera.test', title: 'Baterista', location: 'Matola', birthDate: '2007-01-09' },
  { key: 'sara', name: 'Sara Cossa', email: 'sara@lidera.test', title: 'Teclista', location: 'Maputo', birthDate: '2002-06-03' },
  { key: 'pedro', name: 'Pedro Nhantumbo', email: 'pedro@lidera.test', title: 'Guitarrista', location: 'Xai-Xai', birthDate: '2006-04-27' },
];
const people = { leader: { id: leader.id, token: L } };

async function ensureMember(m, guardian) {
  let r = await call('POST', '/auth/login', null, { email: m.email, password: PASS });
  if (r.status === 403) return { pending: true };
  if (!r.ok) {
    await must('POST', '/auth/register-member', L, {
      name: m.name, email: m.email, password: PASS, confirmPassword: PASS, churchId,
      birthDate: m.birthDate, title: m.title, location: m.location, ...(guardian && { guardian }),
    });
    count('membros');
    r = await call('POST', '/auth/login', null, { email: m.email, password: PASS });
    if (r.status === 403) return { pending: true };
    if (!r.ok) throw new Error(`${m.email} não entra depois do cadastro: ${r.message}`);
  }
  return { id: r.data.user.id, token: r.data.token };
}
for (const m of MEMBERS) people[m.key] = await ensureMember(m);

// ── Secção 6: menores e responsável ────────────────────────────
// O Tiago já autorizado; a Beatriz à espera da autorização da mãe (para o dono testar)
const CARLA = { name: 'Carla Mendes', email: 'carla.mendes@lidera.test' };
const TIAGO = { name: 'Tiago Mendes', email: 'tiago.mendes@lidera.test', title: 'Bateria', location: 'Maputo', birthDate: '2010-03-14' };
const BIA = { name: 'Beatriz Mendes', email: 'bia.mendes@lidera.test', title: 'Coro', location: 'Maputo', birthDate: '2012-07-02' };

const carlaExists = (await call('POST', '/auth/login', null, { email: CARLA.email, password: PASS })).ok;
let tiago = await ensureMember(TIAGO, carlaExists
  ? { email: CARLA.email, relationship: 'mae' }
  : { name: CARLA.name, email: CARLA.email, password: PASS, relationship: 'mae' });
if (tiago.pending) {
  const members = await must('GET', `/churches/${churchId}/members`, L);
  const t = members.find((u) => u.email === TIAGO.email);
  await must('POST', `/churches/${churchId}/members/${t.id}/authorize`, L, {});
  count('autorizações');
  tiago = await ensureMember(TIAGO);
}
people.tiago = tiago;
await ensureMember(BIA, { email: CARLA.email, relationship: 'mae' });

// ── Publicações, comentários e reações ─────────────────────────
// Da mais antiga para a mais recente, para o feed ficar na ordem do seed
const POSTS = [
  { key: 'mes', who: 'leader', content: 'Parabéns a todos pelo empenho este mês: quatro ensaios, dois cultos especiais e muita união. Vamos com tudo para o próximo!' },
  { key: 'pedro', who: 'pedro', content: 'Primeira vez a tocar no culto de jovens. Estava nervoso, mas a equipa ajudou muito. Obrigado, família!' },
  { key: 'sara', who: 'sara', content: 'Um exercício simples para quem está a começar no teclado: escala de dó maior com as duas mãos, devagar, 10 minutos por dia. A constância faz toda a diferença!' },
  { key: 'ensaio', who: 'leader', pinned: true, content: 'Ensaio geral neste sábado às 15h no templo. Tragam os instrumentos afinados e a pasta de partituras. Quem não puder vir, avise no chat.' },
  { key: 'lucas', who: 'lucas', content: 'Alguém tem um par de baquetas 5A para emprestar até domingo? As minhas partiram no último ensaio.' },
  { key: 'ana', who: 'ana', content: 'Hoje no ensaio aprendemos a abrir vozes no refrão de "Grande é o Senhor". Ficou lindo! Quem quiser praticar em casa, mando o áudio no chat.' },
];
const COMMENTS = {
  ensaio: [['ana', 'Confirmado! Levo também o metrónomo.'], ['pedro', 'Vou chegar mais cedo para ajudar a montar o som.']],
  ana: [['sara', 'Manda sim, Ana. Quero treinar a segunda voz.']],
  sara: [['lucas', 'Vou começar hoje. Obrigado pela dica!']],
  pedro: [['ana', 'Tocaste muito bem, Pedro!']],
};
const REACTIONS = {
  ensaio: [['ana', 'amen'], ['sara', 'amen'], ['lucas', 'fire'], ['pedro', 'strong']],
  ana: [['sara', 'heart'], ['leader', 'fire'], ['lucas', 'heart']],
  lucas: [['pedro', 'strong'], ['ana', 'praying']],
  sara: [['lucas', 'fire'], ['ana', 'heart']],
  pedro: [['ana', 'fire'], ['leader', 'strong'], ['sara', 'heart'], ['lucas', 'fire']],
};
const existingPosts = new Set(list(await must('GET', '/posts', L)).map((p) => p.content));
for (const p of POSTS) {
  if (existingPosts.has(p.content)) continue;
  const post = await must('POST', '/posts', people[p.who].token, { content: p.content });
  count('publicações');
  if (p.pinned) await must('PATCH', `/posts/${post.id}/pin`, L, { isPinned: true });
  for (const [who, content] of COMMENTS[p.key] || []) {
    await must('POST', `/posts/${post.id}/comment`, people[who].token, { content });
    count('comentários');
  }
  for (const [who, type] of REACTIONS[p.key] || []) {
    await must('POST', `/posts/${post.id}/react`, people[who].token, { type });
    count('reações');
  }
}

// ── Chat da comunidade ─────────────────────────────────────────
// Só as conversas completas entre quem existe online (sem respostas a mensagens que ficaram de fora)
const CHAT = [
  ['ana', 'Bom dia, pessoal! Alguém já tem a cifra de "Rendido estou"?'],
  ['sara', 'Tenho sim, Ana. Envio já.'],
  ['sara', 'Está em Ré maior, mas no ensaio vamos baixar para Dó.'],
  ['lucas', 'Ensaio confirmado para sábado às 15h?'],
  ['leader', 'Confirmado! Cheguem 15 minutos antes para montar o som.'],
  ['pedro', 'Posso levar o meu amplificador, se precisarem.'],
  ['leader', 'Seria ótimo, Pedro. Obrigado!'],
  ['leader', 'Pessoal, o devocional de hoje já está disponível. Vale muito a pena ler.'],
  ['ana', 'Amém! Li agora de manhã.'],
];
const chatContents = new Set(list(await must('GET', '/chat/messages?limit=100', L)).map((m) => m.content));
if (!chatContents.has(CHAT[0][1])) {
  for (const [who, content] of CHAT) {
    await must('POST', '/chat/messages', people[who].token, { content });
    count('mensagens no chat');
  }
}

// ── Devocionais (do mais antigo para o mais recente) ───────────
const DEVOTIONALS = [
  { title: 'Paciência no aprendizado', inactive: true, likes: ['pedro'],
    verse: 'Gálatas 6:9 — E não nos cansemos de fazer o bem, porque a seu tempo ceifaremos.',
    content: 'Aprender um instrumento exige repetição e paciência. A vida espiritual também. Persevere: os frutos vêm a seu tempo.' },
  { title: 'Em tudo dai graças', likes: [],
    verse: '1 Tessalonicenses 5:18 — Em tudo dai graças, porque esta é a vontade de Deus.',
    content: 'Gratidão não depende das circunstâncias. Faça hoje uma lista de três motivos para agradecer a Deus e partilhe um deles com alguém.' },
  { title: 'Servir com alegria', likes: ['lucas'],
    verse: 'Salmos 100:2 — Servi ao Senhor com alegria; e entrai diante dele com canto.',
    content: 'Montar o som, chegar cedo, carregar cadeiras: tudo isso também é louvor quando feito com alegria. Ninguém é pequeno no Reino. Hoje, escolha servir alguém da comunidade sem esperar nada em troca.' },
  { title: 'Uma canção nova', likes: ['ana', 'sara'],
    verse: 'Salmos 96:1 — Cantai ao Senhor um cântico novo; cantai ao Senhor, todas as terras.',
    content: 'Cantar um cântico novo não é apenas aprender uma música diferente. É deixar que cada dia com Deus renove a nossa gratidão. Antes de afinar os instrumentos, afinemos o coração: o louvor que agrada ao Senhor nasce de uma vida entregue a Ele.' },
];
const devotionalTitles = new Set(list(await must('GET', '/devotionals', L)).map((d) => d.title));
for (const d of DEVOTIONALS) {
  if (devotionalTitles.has(d.title)) continue;
  const dev = await must('POST', '/devotionals', L, { title: d.title, verse: d.verse, content: d.content });
  count('devocionais');
  for (const who of d.likes) await must('POST', `/devotionals/${dev.id}/like`, people[who].token);
  if (d.inactive) await must('PUT', `/devotionals/${dev.id}/inactive`, L);
}

// ── Eventos ────────────────────────────────────────────────────
const saturday = nextWeekday(6, 15);
const sunday = nextWeekday(0, 17);
const EVENTS = [
  { title: 'Noite de louvor', startDate: at(-6, 18, 30), endDate: at(-6, 21), location: 'Templo central', description: 'Uma noite inteira dedicada à adoração.', rsvp: [['ana', 'going'], ['sara', 'going'], ['lucas', 'going']] },
  { title: 'Ensaio geral', startDate: saturday, endDate: new Date(saturday.getTime() + 2.5 * HOUR), location: 'Templo central', description: 'Ensaio com toda a equipa de louvor para o culto de domingo.', rsvp: [['ana', 'going'], ['sara', 'going'], ['lucas', 'going'], ['pedro', 'going']] },
  { title: 'Culto de jovens', startDate: sunday, endDate: new Date(sunday.getTime() + 2 * HOUR), location: 'Salão da juventude', description: 'Louvor, palavra e comunhão. Traga um amigo!', rsvp: [['ana', 'going'], ['lucas', 'maybe']] },
  { title: 'Workshop de técnica vocal', startDate: at(10, 9), endDate: at(10, 12), location: 'Sala 2', description: 'Aula prática com exercícios de respiração e afinação. Vagas limitadas.', rsvp: [['ana', 'going'], ['sara', 'maybe']] },
  { title: 'Ação social: entrega de cestas básicas', startDate: at(16, 8), endDate: at(16, 12), location: 'Centro comunitário', description: 'Entrega dos alimentos recolhidos às famílias acompanhadas pela igreja.', rsvp: [['pedro', 'maybe']] },
];
const eventTitles = new Set(list(await must('GET', '/events', L)).map((e) => e.title));
for (const e of EVENTS) {
  if (eventTitles.has(e.title)) continue;
  const { rsvp, ...data } = e;
  const ev = await must('POST', '/events', L, { ...data, startDate: data.startDate.toISOString(), endDate: data.endDate.toISOString() });
  count('eventos');
  for (const [who, status] of rsvp) await must('POST', `/events/${ev.id}/rsvp`, people[who].token, { status });
}

// ── Pedidos de oração ──────────────────────────────────────────
const PRAYERS = [
  { who: 'ana', title: 'Exames finais', content: 'Orem pelos meus exames de fim de curso na próxima semana.', praying: ['sara'] },
  { who: 'lucas', title: 'Decisão profissional', content: 'Estou a decidir sobre uma proposta de trabalho noutra cidade. Orem por sabedoria.', praying: ['ana', 'pedro'] },
];
const prayerTitles = new Set(list(await must('GET', '/prayers', L)).map((p) => p.title));
for (const p of PRAYERS) {
  if (prayerTitles.has(p.title)) continue;
  const pr = await must('POST', '/prayers', people[p.who].token, { title: p.title, content: p.content });
  count('pedidos de oração');
  for (const who of p.praying) await must('POST', `/prayers/${pr.id}/pray`, people[who].token);
}

// ── Enquetes ───────────────────────────────────────────────────
const POLLS = [
  { question: 'Qual o melhor horário para o ensaio extra?', expiresAt: null,
    options: [['Quarta, 18h', []], ['Sexta, 19h', ['ana']], ['Sábado, 10h', ['sara']]] },
  { question: 'Qual música devemos preparar para o culto especial do fim do ano?', expiresAt: at(7, 23, 59),
    options: [['Grande é o Senhor', ['ana', 'sara']], ['Rendido estou', ['lucas']], ['Oceanos', ['pedro']]] },
];
const pollQuestions = new Set(list(await must('GET', '/polls', L)).map((p) => p.question));
for (const p of POLLS) {
  if (pollQuestions.has(p.question)) continue;
  const poll = await must('POST', '/polls', L, {
    question: p.question, options: p.options.map(([text]) => text), expiresAt: p.expiresAt && p.expiresAt.toISOString(),
  });
  count('enquetes');
  for (const [text, voters] of p.options) {
    const option = poll.options.find((o) => o.text === text);
    for (const who of voters) await must('POST', `/polls/${poll.id}/vote`, people[who].token, { optionId: option.id });
  }
}

// ── Pregações ──────────────────────────────────────────────────
const SERMONS = [
  { title: 'Unidade no corpo de Cristo', speaker: 'Pr. Samuel Tembe', scriptureRef: '1 Coríntios 12:12-27', date: ago(17),
    content: 'Somos muitos membros, mas um só corpo.\n\nCada dom é necessário: quem canta, quem toca, quem acolhe e quem ora. Ninguém deve sentir-se menos importante e ninguém deve sentir-se dispensável.' },
  { title: 'Fidelidade nas pequenas coisas', speaker: 'Ev. Marta Nhaca', scriptureRef: 'Lucas 16:10', date: ago(10),
    content: 'Quem é fiel no pouco também é fiel no muito.\n\n• Pontualidade nos ensaios é uma forma de honrar os irmãos.\n• Cuidar dos instrumentos da igreja é cuidar do que é de Deus.\n• Pequenas atitudes constroem grande confiança.' },
  { title: 'O poder do louvor', speaker: 'Pr. Samuel Tembe', scriptureRef: '2 Crónicas 20:21-22', date: ago(3),
    content: 'Josafá colocou os cantores à frente do exército.\n\n1. O louvor vem antes da vitória: é confiança declarada.\n2. Louvar não ignora o problema, coloca-o diante de Deus.\n3. Uma comunidade que louva unida enfrenta as batalhas com fé.\n\nAplicação: começar os ensaios com um momento de oração e não apenas com a afinação.' },
];
const sermonTitles = new Set(list(await must('GET', '/sermons', L)).map((s) => s.title));
for (const s of SERMONS) {
  if (sermonTitles.has(s.title)) continue;
  await must('POST', '/sermons', L, { ...s, date: s.date.toISOString() });
  count('pregações');
}

// ── Células e ministérios ──────────────────────────────────────
const GROUPS = [
  { name: 'Equipa de Louvor', category: 'louvor', description: 'Vozes e instrumentos que conduzem o louvor nos cultos.', members: ['ana', 'sara', 'lucas', 'pedro'] },
  { name: 'Célula Jovens Maputo', category: 'celula', description: 'Encontros semanais às quartas para estudo bíblico e comunhão.', members: ['ana'] },
  { name: 'Intercessão', category: 'ministerio', description: 'Grupo que se reúne para orar pelos pedidos da comunidade.', members: ['sara'] },
];
const groupNames = new Set(list(await must('GET', '/groups', L)).map((g) => g.name));
for (const g of GROUPS) {
  if (groupNames.has(g.name)) continue;
  const group = await must('POST', '/groups', L, { name: g.name, category: g.category, description: g.description });
  count('grupos');
  for (const who of g.members) await must('POST', `/groups/${group.id}/join`, people[who].token);
}

// ── Mensagens privadas (secção 6) ──────────────────────────────
const DMS = [
  { from: 'leader', to: 'tiago', lines: [['leader', 'Oi Tiago! Consegues chegar às 18h no sábado para montar a bateria?'], ['tiago', 'Consigo sim! Levo as baquetas novas.'], ['leader', 'Perfeito, obrigado. Até sábado.']] },
  { from: 'ana', to: 'leader', lines: [['ana', 'Olá! Já tenho a lista de músicas para domingo.'], ['leader', 'Ótimo! Envia quando puderes, que eu passo ao grupo.'], ['ana', 'Envio hoje à noite.']] },
];
for (const dm of DMS) {
  const conv = await must('POST', '/conversations', people[dm.from].token, { userId: people[dm.to].id });
  const history = await must('GET', `/conversations/${conv.id}/messages`, people[dm.from].token);
  if (list(history).some((m) => m.content === dm.lines[0][1])) continue;
  for (const [who, content] of dm.lines) await must('POST', `/conversations/${conv.id}/messages`, people[who].token, { content });
  count('conversas privadas');
}

console.log(Object.keys(created).length ? created : 'Nada a criar: os dados já estavam lá.');
