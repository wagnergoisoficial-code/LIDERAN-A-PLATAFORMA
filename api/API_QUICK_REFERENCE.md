# 🚀 QUICK REFERENCE - API ENDPOINTS

**Servidor:** `http://localhost:3000/api`

---

## 🔑 AUTENTICAÇÃO

### Register (Novo Usuário)
```javascript
POST /auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "Senha123!",
  "churchId": "cmofp5hpa0000p0ix3apqd9fz"
}

✅ Response 201:
{
  "success": true,
  "data": {
    "user": { "id", "name", "email", "role" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login
```javascript
POST /auth/login
Content-Type: application/json
Authorization: (none)

{
  "email": "joao@example.com",
  "password": "Senha123!"
}

✅ Response 200:
{
  "success": true,
  "data": {
    "user": { "id", "name", "email", "role" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 👥 USUÁRIOS

### List Users
```javascript
GET /users
Authorization: Bearer {TOKEN}

✅ Response 200:
{
  "success": true,
  "data": [
    { "id", "name", "email", "role", "churchId" }
  ]
}
```

### Get User by ID
```javascript
GET /users/{USER_ID}
Authorization: Bearer {TOKEN}

✅ Response 200:
{
  "success": true,
  "data": { "id", "name", "email", "role", "churchId" }
}
```

---

## 📝 POSTS

### Create Post
```javascript
POST /posts
Content-Type: application/json
Authorization: Bearer {TOKEN}

{
  "content": "Meu novo post!",
  "imageUrl": "https://example.com/img.jpg"  // optional
}

✅ Response 201:
{
  "success": true,
  "data": {
    "id": "cmofp9dh0000...",
    "content": "Meu novo post!",
    "imageUrl": "...",
    "userId": "...",
    "churchId": "...",
    "createdAt": "2026-04-26T11:43:00.000Z"
  }
}
```

### List Posts
```javascript
GET /posts
Authorization: Bearer {TOKEN}

✅ Response 200:
{
  "success": true,
  "data": [
    { "id", "content", "imageUrl", "userId", "churchId", "createdAt" }
  ]
}
```

---

## 💬 COMENTÁRIOS

### Add Comment to Post
```javascript
POST /posts/{POST_ID}/comment
Content-Type: application/json
Authorization: Bearer {TOKEN}

{
  "content": "Que legal!"
}

✅ Response 201:
{
  "success": true,
  "data": {
    "id": "cmofp9dj6000...",
    "content": "Que legal!",
    "postId": "...",
    "userId": "...",
    "createdAt": "2026-04-26T11:43:00.000Z"
  }
}
```

---

## 📖 DEVOTIONALS (Apenas Líderes)

### Create Devotional
```javascript
POST /devotionals
Content-Type: application/json
Authorization: Bearer {TOKEN}
(Requer role: "leader" ou "admin")

{
  "title": "Fé em Ação",
  "content": "Conteúdo da meditação...",
  "verse": "Tiago 2:26"
}

✅ Response 201:
{
  "success": true,
  "data": {
    "id": "cmofp9dkj0007...",
    "title": "Fé em Ação",
    "content": "...",
    "verse": "Tiago 2:26",
    "userId": "...",
    "churchId": "...",
    "createdAt": "2026-04-26T11:43:00.000Z"
  }
}
```

### List Devotionals
```javascript
GET /devotionals
Authorization: Bearer {TOKEN}

✅ Response 200:
{
  "success": true,
  "data": [
    { "id", "title", "content", "verse", "userId", "churchId", "createdAt" }
  ]
}
```

---

## ⚡ ERROS COMUNS

| Erro | Causa | Solução |
|------|-------|---------|
| 400 Bad Request | Dados inválidos | Verificar payload |
| 401 Unauthorized | Token ausente/inválido | Fazer novo login |
| 403 Forbidden | Sem permissão (role) | Usar usuário leader |
| 404 Not Found | Recurso não existe | Verificar ID |
| 409 Conflict | Email já existe | Usar outro email |
| 500 Server Error | Erro no servidor | Ver logs do servidor |

---

## 🔗 HELPER - JavaScript/React

```javascript
// API Helper
const API_URL = 'http://localhost:3000/api';

const apiCall = async (endpoint, method = 'GET', data = null) => {
  const token = localStorage.getItem('auth_token');
  
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  return response.json();
};

// Uso
const loginResponse = await apiCall('/auth/login', 'POST', {
  email: 'leader@youth.com',
  password: 'Password123'
});

if (loginResponse.success) {
  localStorage.setItem('auth_token', loginResponse.data.token);
}

const users = await apiCall('/users');
```

---

## 🎯 FLUXO TÍPICO

```
1. Registrar/Login
   POST /auth/register ou POST /auth/login
   ↓ Guardar token
   
2. Carregar dados
   GET /users
   GET /posts
   GET /devotionals
   
3. Criar conteúdo
   POST /posts (qualquer usuário)
   POST /devotionals (apenas leader)
   
4. Interagir
   POST /posts/{id}/comment
```

---

## 📊 DADOS DE TESTE

**Church ID:** `cmofp5hpa0000p0ix3apqd9fz`

**Usuários:**
- leader@youth.com / Password123 (role: leader)
- member@youth.com / Password123 (role: member)

---

## ✅ CHECKLIST DE INTEGRAÇÃO

- [ ] Implementar POST /auth/login
- [ ] Guardar token no localStorage
- [ ] Adicionar Authorization header nas requisições
- [ ] Implementar GET /users
- [ ] Implementar POST /posts
- [ ] Implementar GET /posts
- [ ] Implementar POST /posts/{id}/comment
- [ ] Implementar GET /devotionals
- [ ] Implementar POST /devotionals (se for leader)
- [ ] Tratamento de erros global
- [ ] Testes com dados reais

---

**Tudo pronto! 🚀 Boa integração!**
