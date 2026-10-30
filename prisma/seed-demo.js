// Dados de demonstração para a comunidade do líder de teste (leader@church.com).
// Todos os registos criados aqui têm ID com o prefixo "demo_", por isso o script pode ser
// executado várias vezes (recria os dados) e os dados reais nunca são tocados.
//
//   npm run seed:demo            → recria os dados de demonstração
//   npm run seed:demo -- --limpar → remove apenas os dados de demonstração
const bcrypt = require('bcrypt');
const { getPrismaClient } = require('../src/config/database');

const prisma = getPrismaClient();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Datas relativas ao momento da execução
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * HOUR);
const at = (daysFromNow, hour, minute = 0) => {
  const d = new Date(Date.now() + daysFromNow * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const nextWeekday = (weekday, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7 || 7));
  d.setHours(hour, minute, 0, 0);
  return d;
};

const DEMO_MEMBERS = [
  { key: 'ana', name: 'Ana Machava', email: 'ana@lidera.test', title: 'Vocalista', location: 'Maputo', age: 22 },
  { key: 'lucas', name: 'Lucas Sitoe', email: 'lucas@lidera.test', title: 'Baterista', location: 'Matola', age: 19 },
  { key: 'sara', name: 'Sara Cossa', email: 'sara@lidera.test', title: 'Teclista', location: 'Maputo', age: 24 },
  { key: 'pedro', name: 'Pedro Nhantumbo', email: 'pedro@lidera.test', title: 'Guitarrista', location: 'Xai-Xai', age: 20 },
];
const DEMO_PASSWORD = 'Demo@1234';

async function clearDemo() {
  const demo = { id: { startsWith: 'demo_' } };
  // Ordem pensada para as chaves estrangeiras (o resto sai em cascata)
  await prisma.notification.deleteMany({ where: demo });
  await prisma.pollVote.deleteMany({ where: demo });
  await prisma.poll.deleteMany({ where: demo });
  await prisma.prayer.deleteMany({ where: demo });
  await prisma.prayerRequest.deleteMany({ where: demo });
  await prisma.eventAttendance.deleteMany({ where: demo });
  await prisma.event.deleteMany({ where: demo });
  await prisma.devotionalLike.deleteMany({ where: demo });
  await prisma.devotional.deleteMany({ where: demo });
  await prisma.groupMember.deleteMany({ where: demo });
  await prisma.group.deleteMany({ where: demo });
  await prisma.sermonNote.deleteMany({ where: demo });
  await prisma.message.deleteMany({ where: demo });
  await prisma.postReaction.deleteMany({ where: demo });
  await prisma.comment.deleteMany({ where: demo });
  await prisma.post.deleteMany({ where: demo });
  await prisma.user.deleteMany({ where: demo });
}

async function findUser(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Usuário ${email} não encontrado. Rode primeiro o seed principal.`);
  return user;
}

async function main() {
  const onlyClear = process.argv.includes('--limpar');

  await clearDemo();
  if (onlyClear) {
    console.log('Dados de demonstração removidos.');
    return;
  }

  const leader = await findUser('leader@church.com');
  if (!leader.churchId) throw new Error('O líder de teste não tem comunidade ativa. Crie uma no Painel do Líder.');
  const churchId = leader.churchId;
  const church = await prisma.church.findUnique({ where: { id: churchId } });

  // Membros reais da comunidade (quando existirem)
  const real = {};
  for (const [key, email] of [['herminio', 'h@mail.com'], ['delio', 'Delio@mail.com'], ['jonas', 'Jonas@mail.com'], ['teste', 'membro@teste.com']]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u && u.churchId === churchId) real[key] = u;
  }

  // Novos membros de demonstração
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const demo = {};
  for (const m of DEMO_MEMBERS) {
    demo[m.key] = await prisma.user.create({
      data: {
        id: `demo_user_${m.key}`,
        name: m.name,
        email: m.email,
        password,
        role: 'member',
        title: m.title,
        location: m.location,
        age: m.age,
        churchId,
        leaderId: leader.id,
        bio: `${m.title} na comunidade ${church.name}.`,
        skills: JSON.stringify(['Louvor', m.title]),
        createdAt: ago(30),
      },
    });
  }

  const people = { leader, ...real, ...demo };
  const pick = (...keys) => keys.map((k) => people[k]).filter(Boolean);
  const id = (prefix) => { let n = 0; return () => `demo_${prefix}_${++n}`; };

  // ── Publicações ──────────────────────────────────────────────
  const postId = id('post');
  const posts = [
    { who: 'leader', when: ago(1, 3), pinned: true, content: 'Ensaio geral neste sábado às 15h no templo. Tragam os instrumentos afinados e a pasta de partituras. Quem não puder vir, avise no chat.' },
    { who: 'ana', when: ago(0, 5), content: 'Hoje no ensaio aprendemos a abrir vozes no refrão de "Grande é o Senhor". Ficou lindo! Quem quiser praticar em casa, mando o áudio no chat.' },
    { who: 'lucas', when: ago(0, 9), content: 'Alguém tem um par de baquetas 5A para emprestar até domingo? As minhas partiram no último ensaio.' },
    { who: 'herminio', when: ago(2, 8), content: 'Gratidão a Deus pelo culto de domingo. Ver os jovens a louvar com tanta entrega encheu o meu coração.' },
    { who: 'sara', when: ago(3, 2), content: 'Um exercício simples para quem está a começar no teclado: escala de dó maior com as duas mãos, devagar, 10 minutos por dia. A constância faz toda a diferença!' },
    { who: 'jonas', when: ago(4, 6), content: 'Lembrete: a recolha de alimentos para a ação social continua até sexta-feira. Deixem as doações na secretaria da igreja.' },
    { who: 'pedro', when: ago(5, 1), content: 'Primeira vez a tocar no culto de jovens. Estava nervoso, mas a equipa ajudou muito. Obrigado, família!' },
    { who: 'delio', when: ago(6, 9), content: 'Salmos 150:6 — Tudo quanto tem fôlego louve ao Senhor. Bom dia a todos!' },
    { who: 'teste', when: ago(7, 4), content: 'Cheguei há pouco tempo à comunidade e já me sinto em casa. Obrigado pelo acolhimento!' },
    { who: 'leader', when: ago(9, 3), content: 'Parabéns a todos pelo empenho este mês: quatro ensaios, dois cultos especiais e muita união. Vamos com tudo para o próximo!' },
  ].filter((p) => people[p.who]);

  const createdPosts = [];
  for (const p of posts) {
    createdPosts.push(await prisma.post.create({
      data: {
        id: postId(),
        content: p.content,
        isPinned: !!p.pinned,
        type: p.pinned ? 'announcement' : 'post',
        userId: people[p.who].id,
        churchId,
        createdAt: p.when,
      },
    }));
  }
  const postByAuthor = (who, n = 0) => createdPosts.filter((p) => p.userId === people[who]?.id)[n];

  // Comentários
  const commentId = id('comment');
  const comments = [
    [postByAuthor('leader'), 'ana', 'Confirmado! Levo também o metrónomo.', 2],
    [postByAuthor('leader'), 'pedro', 'Vou chegar mais cedo para ajudar a montar o som.', 3],
    [postByAuthor('leader'), 'teste', 'Posso ir mesmo sem tocar nenhum instrumento? Gostava de aprender.', 4],
    [postByAuthor('leader'), 'leader', 'Claro! Todos são bem-vindos.', 5],
    [postByAuthor('ana'), 'sara', 'Manda sim, Ana. Quero treinar a segunda voz.', 1],
    [postByAuthor('ana'), 'herminio', 'Ficou mesmo bonito. Parabéns à equipa!', 2],
    [postByAuthor('lucas'), 'delio', 'Tenho um par em casa, levo no sábado.', 1],
    [postByAuthor('herminio'), 'jonas', 'Amém! Foi um culto abençoado.', 2],
    [postByAuthor('sara'), 'lucas', 'Vou começar hoje. Obrigado pela dica!', 3],
    [postByAuthor('pedro'), 'ana', 'Tocaste muito bem, Pedro!', 1],
    [postByAuthor('teste'), 'leader', 'Que bom ter-te connosco!', 1],
  ].filter(([post, who]) => post && people[who]);

  for (const [post, who, content, hoursAfter] of comments) {
    await prisma.comment.create({
      data: { id: commentId(), content, postId: post.id, userId: people[who].id, createdAt: new Date(post.createdAt.getTime() + hoursAfter * HOUR) },
    });
  }

  // Reações
  const reactionId = id('reaction');
  const reactions = [
    [postByAuthor('leader'), ['ana', 'amen'], ['sara', 'amen'], ['lucas', 'fire'], ['pedro', 'strong'], ['teste', 'heart'], ['herminio', 'amen']],
    [postByAuthor('ana'), ['sara', 'heart'], ['leader', 'fire'], ['lucas', 'heart'], ['jonas', 'amen']],
    [postByAuthor('lucas'), ['pedro', 'strong'], ['ana', 'praying']],
    [postByAuthor('herminio'), ['leader', 'amen'], ['jonas', 'amen'], ['delio', 'praying'], ['sara', 'heart']],
    [postByAuthor('sara'), ['lucas', 'fire'], ['teste', 'strong'], ['ana', 'heart']],
    [postByAuthor('jonas'), ['leader', 'heart'], ['herminio', 'amen']],
    [postByAuthor('pedro'), ['ana', 'fire'], ['leader', 'strong'], ['sara', 'heart'], ['lucas', 'fire']],
    [postByAuthor('delio'), ['jonas', 'amen'], ['teste', 'praying']],
    [postByAuthor('teste'), ['leader', 'heart'], ['ana', 'heart'], ['sara', 'amen']],
  ];
  for (const [post, ...list] of reactions) {
    if (!post) continue;
    for (const [who, type] of list) {
      if (!people[who]) continue;
      await prisma.postReaction.create({ data: { id: reactionId(), postId: post.id, userId: people[who].id, type } });
    }
  }

  // ── Chat ─────────────────────────────────────────────────────
  const messageId = id('message');
  const chat = [
    ['ana', 'Bom dia, pessoal! Alguém já tem a cifra de "Rendido estou"?', ago(1, 26)],
    ['sara', 'Tenho sim, Ana. Envio já.', ago(1, 25.8)],
    ['sara', 'Está em Ré maior, mas no ensaio vamos baixar para Dó.', ago(1, 25.7)],
    ['lucas', 'Ensaio confirmado para sábado às 15h?', ago(1, 9)],
    ['leader', 'Confirmado! Cheguem 15 minutos antes para montar o som.', ago(1, 8.8)],
    ['pedro', 'Posso levar o meu amplificador, se precisarem.', ago(1, 8.5)],
    ['leader', 'Seria ótimo, Pedro. Obrigado!', ago(1, 8.4)],
    ['herminio', 'Eu levo os cabos e o tripé dos microfones.', ago(1, 8)],
    ['jonas', 'Lembrem-se da recolha de alimentos até sexta.', ago(0, 20)],
    ['teste', 'Que horas termina o ensaio? Quero combinar a boleia.', ago(0, 12)],
    ['ana', 'Normalmente até às 17h30.', ago(0, 11.9)],
    ['delio', 'Hoje à noite temos oração pelos estudantes em época de exames.', ago(0, 6)],
    ['sara', 'Estarei lá.', ago(0, 5.9)],
    ['lucas', 'Contem comigo também.', ago(0, 5.8)],
    ['leader', 'Pessoal, o devocional de hoje já está disponível. Vale muito a pena ler.', ago(0, 3)],
    ['ana', 'Amém! Li agora de manhã.', ago(0, 2.5)],
  ].filter(([who]) => people[who]);
  for (const [who, content, when] of chat) {
    await prisma.message.create({ data: { id: messageId(), content, userId: people[who].id, churchId, createdAt: when } });
  }

  // ── Devocionais ──────────────────────────────────────────────
  const devotionals = [
    {
      id: 'demo_devotional_1', title: 'Uma canção nova', activatedAt: ago(0, 3), isActive: true,
      verse: 'Salmos 96:1 — Cantai ao Senhor um cântico novo; cantai ao Senhor, todas as terras.',
      content: 'Cantar um cântico novo não é apenas aprender uma música diferente. É deixar que cada dia com Deus renove a nossa gratidão. Antes de afinar os instrumentos, afinemos o coração: o louvor que agrada ao Senhor nasce de uma vida entregue a Ele.',
      likes: ['ana', 'sara', 'herminio', 'teste'],
    },
    {
      id: 'demo_devotional_2', title: 'Servir com alegria', activatedAt: ago(0, 10), isActive: true,
      verse: 'Salmos 100:2 — Servi ao Senhor com alegria; e entrai diante dele com canto.',
      content: 'Montar o som, chegar cedo, carregar cadeiras: tudo isso também é louvor quando feito com alegria. Ninguém é pequeno no Reino. Hoje, escolha servir alguém da comunidade sem esperar nada em troca.',
      likes: ['lucas', 'jonas'],
    },
    {
      id: 'demo_devotional_3', title: 'Paciência no aprendizado', activatedAt: ago(5), isActive: false,
      verse: 'Gálatas 6:9 — E não nos cansemos de fazer o bem, porque a seu tempo ceifaremos.',
      content: 'Aprender um instrumento exige repetição e paciência. A vida espiritual também. Persevere: os frutos vêm a seu tempo.',
      likes: ['pedro'],
    },
    {
      id: 'demo_devotional_4', title: 'Em tudo dai graças', activatedAt: ago(3), isActive: true,
      verse: '1 Tessalonicenses 5:18 — Em tudo dai graças, porque esta é a vontade de Deus.',
      content: 'Gratidão não depende das circunstâncias. Faça hoje uma lista de três motivos para agradecer a Deus e partilhe um deles com alguém.',
      likes: [],
    },
  ];
  for (const d of devotionals) {
    await prisma.devotional.create({
      data: {
        id: d.id, title: d.title, verse: d.verse, content: d.content, isActive: d.isActive,
        activatedAt: d.activatedAt, createdAt: d.activatedAt, userId: leader.id, churchId,
      },
    });
    let n = 0;
    for (const who of d.likes) {
      if (!people[who]) continue;
      await prisma.devotionalLike.create({ data: { id: `${d.id}_like_${++n}`, devotionalId: d.id, userId: people[who].id } });
    }
  }

  // ── Eventos ──────────────────────────────────────────────────
  const saturday = nextWeekday(6, 15);
  const sunday = nextWeekday(0, 17);
  const events = [
    { id: 'demo_event_1', title: 'Ensaio geral', startDate: saturday, endDate: new Date(saturday.getTime() + 2.5 * HOUR), location: 'Templo central', description: 'Ensaio com toda a equipa de louvor para o culto de domingo.', rsvp: [['ana', 'going'], ['sara', 'going'], ['lucas', 'going'], ['pedro', 'going'], ['herminio', 'going'], ['teste', 'maybe']] },
    { id: 'demo_event_2', title: 'Culto de jovens', startDate: sunday, endDate: new Date(sunday.getTime() + 2 * HOUR), location: 'Salão da juventude', description: 'Louvor, palavra e comunhão. Traga um amigo!', rsvp: [['ana', 'going'], ['jonas', 'going'], ['delio', 'going'], ['teste', 'going'], ['lucas', 'maybe']] },
    { id: 'demo_event_3', title: 'Workshop de técnica vocal', startDate: at(10, 9), endDate: at(10, 12), location: 'Sala 2', description: 'Aula prática com exercícios de respiração e afinação. Vagas limitadas.', rsvp: [['ana', 'going'], ['sara', 'maybe'], ['teste', 'going']] },
    { id: 'demo_event_4', title: 'Ação social: entrega de cestas básicas', startDate: at(16, 8), endDate: at(16, 12), location: 'Centro comunitário', description: 'Entrega dos alimentos recolhidos às famílias acompanhadas pela igreja.', rsvp: [['jonas', 'going'], ['herminio', 'going'], ['pedro', 'maybe']] },
    { id: 'demo_event_5', title: 'Noite de louvor', startDate: at(-6, 18, 30), endDate: at(-6, 21), location: 'Templo central', description: 'Uma noite inteira dedicada à adoração.', rsvp: [['ana', 'going'], ['sara', 'going'], ['lucas', 'going'], ['delio', 'going']] },
  ];
  for (const e of events) {
    const { rsvp, ...data } = e;
    await prisma.event.create({ data: { ...data, churchId, createdBy: leader.id, createdAt: ago(8) } });
    let n = 0;
    for (const [who, status] of rsvp) {
      if (!people[who]) continue;
      await prisma.eventAttendance.create({ data: { id: `${e.id}_rsvp_${++n}`, eventId: e.id, userId: people[who].id, status } });
    }
  }

  // ── Pedidos de oração ────────────────────────────────────────
  const prayers = [
    { id: 'demo_prayer_1', who: 'herminio', title: 'Saúde da minha mãe', content: 'Peço oração pela recuperação da minha mãe, que fez uma cirurgia esta semana.', when: ago(1, 5), praying: ['leader', 'ana', 'sara', 'jonas'] },
    { id: 'demo_prayer_2', who: 'lucas', anonymous: true, title: 'Decisão profissional', content: 'Estou a decidir sobre uma proposta de trabalho noutra cidade. Orem por sabedoria.', when: ago(2), praying: ['ana', 'pedro'] },
    { id: 'demo_prayer_3', who: 'ana', title: 'Exames finais', content: 'Orem pelos meus exames de fim de curso na próxima semana.', when: ago(3), praying: ['sara', 'teste', 'delio'] },
    { id: 'demo_prayer_4', who: 'jonas', answered: true, title: 'Viagem da família', content: 'Orem pela viagem da minha família a Inhambane.', when: ago(6), praying: ['leader', 'herminio'] },
    { id: 'demo_prayer_5', who: 'teste', title: 'Adaptação na nova cidade', content: 'Mudei-me há pouco tempo e peço oração para me adaptar e fazer boas amizades.', when: ago(0, 14), praying: ['ana'] },
  ].filter((p) => people[p.who]);
  for (const p of prayers) {
    await prisma.prayerRequest.create({
      data: { id: p.id, title: p.title, content: p.content, isAnonymous: !!p.anonymous, isAnswered: !!p.answered, userId: people[p.who].id, churchId, createdAt: p.when },
    });
    let n = 0;
    for (const who of p.praying) {
      if (!people[who]) continue;
      await prisma.prayer.create({ data: { id: `${p.id}_pray_${++n}`, prayerRequestId: p.id, userId: people[who].id } });
    }
  }

  // ── Enquetes ─────────────────────────────────────────────────
  const polls = [
    { id: 'demo_poll_1', question: 'Qual música devemos preparar para o culto especial do fim do ano?', expiresAt: at(7, 23, 59), when: ago(2),
      options: [['Grande é o Senhor', ['ana', 'sara', 'teste']], ['Rendido estou', ['lucas', 'herminio']], ['Oceanos', ['pedro']]] },
    { id: 'demo_poll_2', question: 'Qual o melhor horário para o ensaio extra?', expiresAt: null, when: ago(4),
      options: [['Quarta, 18h', ['delio']], ['Sexta, 19h', ['ana', 'jonas']], ['Sábado, 10h', ['sara']]] },
  ];
  for (const p of polls) {
    await prisma.poll.create({ data: { id: p.id, question: p.question, expiresAt: p.expiresAt, churchId, createdBy: leader.id, createdAt: p.when } });
    let o = 0;
    for (const [text, voters] of p.options) {
      const optionId = `${p.id}_opt_${++o}`;
      await prisma.pollOption.create({ data: { id: optionId, text, pollId: p.id } });
      let v = 0;
      for (const who of voters) {
        if (!people[who]) continue;
        await prisma.pollVote.create({ data: { id: `${optionId}_vote_${++v}`, pollOptionId: optionId, userId: people[who].id } });
      }
    }
  }

  // ── Pregações ────────────────────────────────────────────────
  const sermons = [
    { id: 'demo_sermon_1', title: 'O poder do louvor', speaker: 'Pr. Samuel Tembe', scriptureRef: '2 Crónicas 20:21-22', date: ago(3),
      content: 'Josafá colocou os cantores à frente do exército.\n\n1. O louvor vem antes da vitória: é confiança declarada.\n2. Louvar não ignora o problema, coloca-o diante de Deus.\n3. Uma comunidade que louva unida enfrenta as batalhas com fé.\n\nAplicação: começar os ensaios com um momento de oração e não apenas com a afinação.' },
    { id: 'demo_sermon_2', title: 'Fidelidade nas pequenas coisas', speaker: 'Ev. Marta Nhaca', scriptureRef: 'Lucas 16:10', date: ago(10),
      content: 'Quem é fiel no pouco também é fiel no muito.\n\n• Pontualidade nos ensaios é uma forma de honrar os irmãos.\n• Cuidar dos instrumentos da igreja é cuidar do que é de Deus.\n• Pequenas atitudes constroem grande confiança.' },
    { id: 'demo_sermon_3', title: 'Unidade no corpo de Cristo', speaker: 'Pr. Samuel Tembe', scriptureRef: '1 Coríntios 12:12-27', date: ago(17),
      content: 'Somos muitos membros, mas um só corpo.\n\nCada dom é necessário: quem canta, quem toca, quem acolhe e quem ora. Ninguém deve sentir-se menos importante e ninguém deve sentir-se dispensável.' },
  ];
  for (const s of sermons) {
    await prisma.sermonNote.create({ data: { ...s, churchId, authorId: leader.id, createdAt: s.date } });
  }

  // ── Células e ministérios ────────────────────────────────────
  const groups = [
    { id: 'demo_group_1', name: 'Equipa de Louvor', category: 'louvor', leader: 'ana', description: 'Vozes e instrumentos que conduzem o louvor nos cultos.', members: ['ana', 'sara', 'lucas', 'pedro', 'herminio', 'delio'] },
    { id: 'demo_group_2', name: 'Célula Jovens Maputo', category: 'celula', leader: 'leader', description: 'Encontros semanais às quartas para estudo bíblico e comunhão.', members: ['leader', 'teste', 'jonas', 'ana'] },
    { id: 'demo_group_3', name: 'Intercessão', category: 'ministerio', leader: people.jonas ? 'jonas' : 'leader', description: 'Grupo que se reúne para orar pelos pedidos da comunidade.', members: ['jonas', 'delio', 'sara', 'leader'] },
  ];
  for (const g of groups) {
    const groupLeader = people[g.leader];
    await prisma.group.create({ data: { id: g.id, name: g.name, category: g.category, description: g.description, churchId, leaderId: groupLeader.id, createdAt: ago(20) } });
    let n = 0;
    for (const who of g.members) {
      if (!people[who]) continue;
      await prisma.groupMember.create({
        data: { id: `${g.id}_member_${++n}`, groupId: g.id, userId: people[who].id, role: who === g.leader ? 'leader' : 'member' },
      });
    }
  }

  // ── Notificações (como as que a aplicação gera) ──────────────
  const notifId = id('notification');
  const notify = (who, type, title, body, linkType, linkId, when, isRead = false) =>
    people[who] && prisma.notification.create({
      data: { id: notifId(), userId: people[who].id, type, title, body, linkType, linkId, createdAt: when, isRead },
    });
  const pinned = postByAuthor('leader');
  await Promise.all([
    notify('leader', 'new_comment', 'Ana Machava comentou sua publicação', 'Confirmado! Levo também o metrónomo.', 'post', pinned?.id, ago(1, 1)),
    notify('leader', 'reaction', 'Sara Cossa reagiu à sua publicação', 'Ensaio geral neste sábado às 15h no templo…', 'post', pinned?.id, ago(1, 2)),
    notify('leader', 'new_prayer', 'Herminio pediu oração', 'Saúde da minha mãe', 'prayer_request', 'demo_prayer_1', ago(1, 5)),
    notify('leader', 'group_join', 'Membro Teste entrou no grupo', 'Célula Jovens Maputo', 'group', 'demo_group_2', ago(2), true),
    notify('leader', 'new_post', 'Ana Machava publicou no feed', 'Hoje no ensaio aprendemos a abrir vozes no refrão…', 'post', postByAuthor('ana')?.id, ago(0, 5)),
    notify('teste', 'new_devotional', 'Novo devocional: Uma canção nova', 'Salmos 96:1', 'devotional', 'demo_devotional_1', ago(0, 3)),
    notify('teste', 'praying', 'Ana Machava está orando por você', 'Adaptação na nova cidade', 'prayer_request', 'demo_prayer_5', ago(0, 8)),
    notify('teste', 'new_event', 'Novo evento: Ensaio geral', saturday.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ' · Templo central', 'event', 'demo_event_1', ago(1)),
    notify('teste', 'poll_created', 'Nova enquete na comunidade', 'Qual música devemos preparar para o culto especial do fim do ano?', 'poll', 'demo_poll_1', ago(2), true),
    notify('teste', 'new_sermon', 'Nova pregação: O poder do louvor', 'Pr. Samuel Tembe · 2 Crónicas 20:21-22', 'sermon', 'demo_sermon_1', ago(3), true),
    notify('ana', 'new_comment', 'Sara Cossa comentou sua publicação', 'Manda sim, Ana. Quero treinar a segunda voz.', 'post', postByAuthor('ana')?.id, ago(0, 4)),
    notify('ana', 'praying', 'Sara Cossa está orando por você', 'Exames finais', 'prayer_request', 'demo_prayer_3', ago(2)),
    notify('herminio', 'praying', 'Church Leader está orando por você', 'Saúde da minha mãe', 'prayer_request', 'demo_prayer_1', ago(1, 4)),
    notify('jonas', 'prayer_answered', 'Oração respondida', 'Viagem da família', 'prayer_request', 'demo_prayer_4', ago(5), true),
  ]);

  const summary = {
    membros: DEMO_MEMBERS.length,
    publicações: createdPosts.length,
    comentários: comments.length,
    mensagens: chat.length,
    devocionais: devotionals.length,
    eventos: events.length,
    orações: prayers.length,
    enquetes: polls.length,
    pregações: sermons.length,
    grupos: groups.length,
  };
  console.log(`Dados de demonstração criados na comunidade "${church.name}":`);
  console.table(summary);
  console.log(`Membros de demonstração: ${DEMO_MEMBERS.map((m) => m.email).join(', ')} (senha ${DEMO_PASSWORD})`);
}

main()
  .catch((err) => {
    console.error('Erro ao criar dados de demonstração:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
