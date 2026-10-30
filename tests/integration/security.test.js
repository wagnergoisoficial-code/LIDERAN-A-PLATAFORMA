// Testes de segurança: cabeçalhos, CORS, injeção de SQL, tokens forjados, uploads maliciosos,
// força bruta e excesso de pedidos. Limites baixos para os bloqueios aparecerem depressa.
process.env.RATE_LIMIT_PER_MINUTE = '80';
process.env.LOGIN_ATTEMPTS = '5';

const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const App = require('../../src/app');
const { disconnectPrisma } = require('../../src/config/database');

const ALLOWED_ORIGIN = 'https://app.lidera.test';
const stamp = Date.now();
let server;
let ORIGIN;
let leader;

const call = async (method, path, { token, body, headers = {} } = {}) => {
  const res = await fetch(`${ORIGIN}${path}`, {
    method,
    headers: {
      ...(body !== undefined && !(body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body === undefined ? undefined : body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* corpo não-JSON */ }
  return { res, status: res.status, json };
};

const register = async (name, email) => {
  const { json } = await call('POST', '/api/auth/register', {
    body: { name, email, password: 'Senha1234', confirmPassword: 'Senha1234' },
  });
  return json.data;
};

beforeAll(async () => {
  server = new App().getApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  ORIGIN = `http://127.0.0.1:${server.address().port}`;

  leader = await register('Líder Segurança', `seg${stamp}@t.com`);
  const church = await call('POST', '/api/churches', { token: leader.token, body: { name: 'Comunidade Segura' } });
  leader.churchId = church.json.data.id;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectPrisma();
});

test('envia cabeçalhos de segurança e não revela a tecnologia', async () => {
  const { res } = await call('GET', '/health');
  expect(res.status).toBe(200);
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  expect(res.headers.get('strict-transport-security')).toMatch(/max-age=/);
  expect(res.headers.get('content-security-policy')).toMatch(/default-src 'none'/);
  expect(res.headers.get('x-frame-options')).toBeTruthy();
  expect(res.headers.get('x-powered-by')).toBeNull();
});

test('CORS só autoriza o site configurado', async () => {
  const evil = await call('OPTIONS', '/api/posts', {
    headers: { Origin: 'https://site-malicioso.test', 'Access-Control-Request-Method': 'GET' },
  });
  expect(evil.res.headers.get('access-control-allow-origin')).toBeNull();

  const ok = await call('OPTIONS', '/api/posts', {
    headers: { Origin: ALLOWED_ORIGIN, 'Access-Control-Request-Method': 'GET' },
  });
  expect(ok.res.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
});

test('tentativas de SQL injection não têm efeito', async () => {
  for (const q of ["' OR '1'='1", "%' OR 1=1 --", "'; DROP TABLE users; --"]) {
    const search = await call('GET', `/api/search?q=${encodeURIComponent(q)}`, { token: leader.token });
    expect(search.status).toBe(200);
    expect(search.json.data.members).toHaveLength(0);
    expect(search.json.data.posts).toHaveLength(0);
  }

  const badEmail = await call('POST', '/api/auth/login', { body: { email: "' OR '1'='1", password: 'x' } });
  expect(badEmail.status).toBe(400);

  const badPassword = await call('POST', '/api/auth/login', {
    body: { email: `seg${stamp}@t.com`, password: "' OR '1'='1" },
  });
  expect(badPassword.status).toBe(401);

  expect((await call('GET', `/api/posts/${encodeURIComponent("1' OR '1'='1")}`, { token: leader.token })).status).toBe(404);
  expect((await call('GET', `/api/users/${encodeURIComponent("' OR 1=1 --")}`, { token: leader.token })).status).toBe(404);

  // A tabela de utilizadores continua lá
  expect((await call('GET', '/api/auth/me', { token: leader.token })).status).toBe(200);
});

test('rejeita tokens forjados ou adulterados', async () => {
  const forged = jwt.sign({ id: leader.user.id, role: 'admin' }, 'dev-secret-key');
  expect((await call('GET', '/api/auth/me', { token: forged })).status).toBe(401);

  const [header, payload] = leader.token.split('.');
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${payload}.`;
  expect((await call('GET', '/api/auth/me', { token: unsigned })).status).toBe(401);

  const tampered = `${header}.${Buffer.from(JSON.stringify({ id: leader.user.id, role: 'admin' })).toString('base64url')}.${leader.token.split('.')[2]}`;
  expect((await call('GET', '/api/auth/me', { token: tampered })).status).toBe(401);
});

test('recusa corpos de pedido demasiado grandes', async () => {
  const huge = JSON.stringify({ email: 'a@a.com', password: 'x'.repeat(200 * 1024) });
  const { status } = await call('POST', '/api/auth/login', { body: huge });
  expect(status).toBe(413);
});

test('uploads: só imagens reais, reprocessadas e servidas com segurança', async () => {
  const send = (blob, filename, content = 'Foto') => {
    const form = new FormData();
    form.append('content', content);
    form.append('image', blob, filename);
    return call('POST', '/api/posts', { token: leader.token, body: form });
  };

  // HTML disfarçado de PNG
  const disguised = await send(new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/png' }), 'foto.png');
  expect(disguised.status).toBe(400);

  // SVG (pode conter scripts) não é aceite
  const svg = await send(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' }), 'x.svg');
  expect(svg.status).toBe(400);

  // Ficheiro acima do limite (5 MB)
  const big = Buffer.alloc(6 * 1024 * 1024);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(big);
  expect((await send(new Blob([big], { type: 'image/png' }), 'grande.png')).status).toBe(400);

  // Imagem real: convertida para WebP, reduzida e servida sem permitir execução
  const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#1e87f0' } }).png().toBuffer();
  const ok = await send(new Blob([png], { type: 'image/png' }), 'ensaio.png', 'Foto do ensaio');
  expect(ok.status).toBe(201);
  expect(ok.json.data.imageUrl).toMatch(/^https:\/\/api\.lidera\.test\/uploads\/c[a-z0-9]+$/);

  const imagePath = new URL(ok.json.data.imageUrl).pathname;
  const image = await call('GET', imagePath);
  expect(image.status).toBe(200);
  expect(image.res.headers.get('content-type')).toBe('image/webp');
  expect(image.res.headers.get('x-content-type-options')).toBe('nosniff');
  expect(image.res.headers.get('content-security-policy')).toMatch(/sandbox/);
  const meta = await sharp(Buffer.from(await image.res.arrayBuffer())).metadata();
  expect(meta.format).toBe('webp');
  expect(meta.width).toBe(1600);

  // Links externos enviados pelo cliente são ignorados / recusados
  const external = await call('POST', '/api/posts', {
    token: leader.token,
    body: { content: 'Com link externo', imageUrl: 'https://site-malicioso.test/pixel.png' },
  });
  expect(external.status).toBe(201);
  expect(external.json.data.imageUrl).toBeNull();

  const avatar = await call('PUT', '/api/users/profile', {
    token: leader.token,
    body: { profileImage: 'https://site-malicioso.test/a.png' },
  });
  expect(avatar.status).toBe(400);
});

test('força bruta no login é bloqueada por conta', async () => {
  const email = `alvo${stamp}@t.com`;
  await register('Conta Alvo', email);

  for (let i = 0; i < 5; i++) {
    const attempt = await call('POST', '/api/auth/login', { body: { email, password: `errada${i}` } });
    expect(attempt.status).toBe(401);
  }

  const blocked = await call('POST', '/api/auth/login', { body: { email, password: 'errada-de-novo' } });
  expect(blocked.status).toBe(429);
  expect(blocked.json.message).toMatch(/tentativas/i);

  // Mesmo com a senha certa, a conta fica protegida até a janela expirar
  const correct = await call('POST', '/api/auth/login', { body: { email, password: 'Senha1234' } });
  expect(correct.status).toBe(429);
});

test('excesso de pedidos por IP é limitado', async () => {
  const statuses = [];
  for (let i = 0; i < 90; i++) {
    statuses.push((await call('GET', '/api/notifications', { token: leader.token })).status);
  }
  expect(statuses).toContain(429);
});
