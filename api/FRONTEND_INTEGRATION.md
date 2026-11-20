# 📱 GUIA DE INTEGRAÇÃO - API YOUTH CHURCH PORTAL

## ⚡ Quick Start

**Base URL:** `http://localhost:3000/api`  
**Porta de Produção:** `3000`  
**Autenticação:** JWT Bearer Token

---

## 🔐 AUTENTICAÇÃO

### 1. Registro de Usuário
**Endpoint:** `POST /auth/register`  
**Autenticação:** Não requer  
**Status:** ✅ FUNCIONANDO

```javascript
// Request
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "João Silva",
    email: "joao@example.com",
    password: "Senha123!",
    churchId: "cmofp5hpa0000p0ix3apqd9fz"  // ID da chiesa
  })
})

// Response (201 Created)
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "cmofp9dam000110eo6hpx...",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validações:**
- ✅ Email obrigatório e único
- ✅ Senha mínimo 6 caracteres
- ✅ churchId deve ser válido
- ✅ Nome obrigatório

---

### 2. Login
**Endpoint:** `POST /auth/login`  
**Autenticação:** Não requer  
**Status:** ✅ FUNCIONANDO

```javascript
// Request
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "joao@example.com",
    password: "Senha123!"
  })
})

// Response (200 OK)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "cmofp5hrt0002p0ixg690rlhu",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

// Erros (401 Unauthorized)
{
  "success": false,
  "message": "Invalid credentials",
  "statusCode": 401
}
```

**Como usar o token:**
```javascript
// Armazenar token
const token = response.data.token;
localStorage.setItem('token', token);

// Usar em requisições autenticadas
fetch('http://localhost:3000/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 👥 USUÁRIOS

### 3. Listar Todos os Usuários
**Endpoint:** `GET /users`  
**Autenticação:** ✅ REQUER TOKEN  
**Status:** ✅ FUNCIONANDO

```javascript
fetch('http://localhost:3000/api/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Response (200 OK)
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "cmofp5hrt0002p0ixg690rlhu",
      "name": "John Leader",
      "email": "leader@youth.com",
      "role": "leader",
      "churchId": "cmofp5hpa0000p0ix3apqd9fz"
    },
    {
      "id": "cmofp5hrt0003p0ixg690rlh",
      "name": "Jane Member",
      "email": "member@youth.com",
      "role": "member",
      "churchId": "cmofp5hpa0000p0ix3apqd9fz"
    }
  ]
}
```

---

### 4. Obter Usuário por ID
**Endpoint:** `GET /users/:id`  
**Autenticação:** ✅ REQUER TOKEN  
**Status:** ✅ FUNCIONANDO

```javascript
fetch('http://localhost:3000/api/users/cmofp5hrt0002p0ixg690rlhu', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Response (200 OK)
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "cmofp5hrt0002p0ixg690rlhu",
    "name": "John Leader",
    "email": "leader@youth.com",
    "role": "leader",
    "churchId": "cmofp5hpa0000p0ix3apqd9fz"
  }
}

// Erro - Usuário não encontrado (404)
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

---

## 📝 POSTS (Feed Social)

### 5. Criar Post
**Endpoint:** `POST /posts`  
**Autenticação:** ✅ REQUER TOKEN  
**Status:** ✅ FUNCIONANDO

```javascript
fetch('http://localhost:3000/api/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: "Participei de um ótimo evento na Igreja!",
    imageUrl: "https://example.com/image.jpg"  // Opcional
  })
})

// Response (201 Created)
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "cmofp9dh0000310eotzkp77p8",
    "content": "Participei de um ótimo evento na Igreja!",
    "imageUrl": "https://example.com/image.jpg",
    "userId": "cmofp5hrt0002p0ixg690rlhu",
    "churchId": "cmofp5hpa0000p0ix3apqd9fz",
    "createdAt": "2026-04-26T11:43:00.000Z"
  }
}
```

**Validações:**
- ✅ Content obrigatório (mínimo 1 caractere)
- ✅ imageUrl opcional

---

### 6. Listar Todos os Posts
**Endpoint:** `GET /posts`  
**Autenticação:** ✅ REQUER TOKEN  
**Status:** ✅ FUNCIONANDO

```javascript
fetch('http://localhost:3000/api/posts', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Response (200 OK)
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": [
    {
      "id": "cmofp9dh0000310eotzkp77p8",
      "content": "Novo post de teste",
      "imageUrl": "https://example.com/image.jpg",
      "userId": "cmofp5hrt0002p0ixg690rlhu",
      "churchId": "cmofp5hpa0000p0ix3apqd9fz",
      "createdAt": "2026-04-26T11:43:00.000Z"
    }
  ]
}
```

---

## 💬 COMENTÁRIOS

### 7. Adicionar Comentário em Post
**Endpoint:** `POST /posts/:id/comment`  
**Autenticação:** ✅ REQUER TOKEN  
**Status:** ✅ FUNCIONANDO

```javascript
fetch('http://localhost:3000/api/posts/cmofp9dh0000310eotzkp77p8/comment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: "Que legal! Eu também estava lá!"
  })
})

// Response (201 Created)
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "cmofp9dj6000510eooy0p9low",
    "content": "Que legal! Eu também estava lá!",
    "postId": "cmofp9dh0000310eotzkp77p8",
    "userId": "cmofp5hrt0002p0ixg690rlhu",
    "createdAt": "2026-04-26T11:43:00.000Z"
  }
}
```

**Validações:**
- ✅ Content obrigatório (mínimo 1 caractere)
- ✅ Post ID deve ser válido

---

## 📖 DEVOTIONALS (Meditações - Apenas Líderes)

### 8. Criar Devotional
**Endpoint:** `POST /devotionals`  
**Autenticação:** ✅ REQUER TOKEN  
**Permissão:** ⚡ SOMENTE ROLE: "leader" ou "admin"  
**Status:** ✅ FUNCIONANDO

```javascript
fetch('http://localhost:3000/api/devotionals', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Fé em Ação",
    content: "Hoje refletimos sobre como nossa fé se manifesta em nossas ações...",
    verse: "Tiago 2:26"
  })
})

// Response (201 Created)
{
  "success": true,
  "message": "Devotional created successfully",
  "data": {
    "id": "cmofp9dkj000710eouaci1rn0",
    "title": "Fé em Ação",
    "content": "Hoje refletimos sobre como nossa fé se manifesta em nossas ações...",
    "verse": "Tiago 2:26",
    "userId": "cmofp5hrt0002p0ixg690rlhu",
    "churchId": "cmofp5hpa0000p0ix3apqd9fz",
    "createdAt": "2026-04-26T11:43:00.000Z"
  }
}

// Erro - Sem permissão (403 Forbidden)
{
  "success": false,
  "message": "Insufficient permissions",
  "statusCode": 403
}
```

**Validações:**
- ✅ Title obrigatório
- ✅ Content obrigatório
- ✅ Verse obrigatório (referência bíblica)
- ✅ Apenas líderes/admins podem criar

---

### 9. Listar Devotionals
**Endpoint:** `GET /devotionals`  
**Autenticação:** ✅ REQUER TOKEN  
**Status:** ✅ FUNCIONANDO

```javascript
fetch('http://localhost:3000/api/devotionals', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Response (200 OK)
{
  "success": true,
  "message": "Devotionals retrieved successfully",
  "data": [
    {
      "id": "cmofp9dkj000710eouaci1rn0",
      "title": "Fé em Ação",
      "content": "Hoje refletimos sobre como nossa fé se manifesta em nossas ações...",
      "verse": "Tiago 2:26",
      "userId": "cmofp5hrt0002p0ixg690rlhu",
      "churchId": "cmofp5hpa0000p0ix3apqd9fz",
      "createdAt": "2026-04-26T11:43:00.000Z"
    }
  ]
}
```

---

## 🚨 TRATAMENTO DE ERROS

A API retorna erros estruturados com código de status HTTP apropriado:

### Erro 400 - Bad Request
```javascript
{
  "success": false,
  "message": "Email is required",
  "statusCode": 400,
  "timestamp": "2026-04-26T11:43:00.000Z"
}
```

### Erro 401 - Unauthorized (Sem Token)
```javascript
{
  "success": false,
  "message": "No token provided",
  "statusCode": 401,
  "timestamp": "2026-04-26T11:43:00.000Z"
}
```

### Erro 403 - Forbidden (Sem Permissão)
```javascript
{
  "success": false,
  "message": "Insufficient permissions",
  "statusCode": 403,
  "timestamp": "2026-04-26T11:43:00.000Z"
}
```

### Erro 404 - Not Found
```javascript
{
  "success": false,
  "message": "User not found",
  "statusCode": 404,
  "timestamp": "2026-04-26T11:43:00.000Z"
}
```

### Erro 409 - Conflict
```javascript
{
  "success": false,
  "message": "Email already registered",
  "statusCode": 409,
  "timestamp": "2026-04-26T11:43:00.000Z"
}
```

### Erro 500 - Server Error
```javascript
{
  "success": false,
  "message": "Internal server error",
  "statusCode": 500,
  "timestamp": "2026-04-26T11:43:00.000Z"
}
```

---

## 🛠️ EXEMPLO COMPLETO - React/JavaScript

### Setup Inicial
```javascript
// constants/api.js
export const API_URL = 'http://localhost:3000/api';
export const TOKEN_KEY = 'auth_token';

// helpers/storage.js
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);
```

### Serviço de API
```javascript
// services/api.js
const API_URL = 'http://localhost:3000/api';

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const api = {
  // Auth
  register: (data) => 
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  login: (data) => 
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Users
  getUsers: () => 
    fetch(`${API_URL}/users`, {
      headers: getHeaders()
    }).then(r => r.json()),

  getUser: (id) => 
    fetch(`${API_URL}/users/${id}`, {
      headers: getHeaders()
    }).then(r => r.json()),

  // Posts
  createPost: (data) => 
    fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  getPosts: () => 
    fetch(`${API_URL}/posts`, {
      headers: getHeaders()
    }).then(r => r.json()),

  addComment: (postId, data) => 
    fetch(`${API_URL}/posts/${postId}/comment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Devotionals
  createDevotional: (data) => 
    fetch(`${API_URL}/devotionals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  getDevotionals: () => 
    fetch(`${API_URL}/devotionals`, {
      headers: getHeaders()
    }).then(r => r.json())
};
```

### Componente React - Login
```javascript
import { useState } from 'react';
import { api } from './services/api';

function LoginComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login({ email, password });
      
      if (result.success) {
        localStorage.setItem('auth_token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        // Redirecionar para dashboard
        window.location.href = '/dashboard';
      } else {
        setError(result.message || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro na conexão com a API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}

export default LoginComponent;
```

### Componente React - Feed de Posts
```javascript
import { useState, useEffect } from 'react';
import { api } from './services/api';

function FeedComponent() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const result = await api.getPosts();
    if (result.success) {
      setPosts(result.data);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const result = await api.createPost({ 
      content,
      imageUrl: '' 
    });

    if (result.success) {
      setContent('');
      await loadPosts();
    }
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleCreatePost}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que está acontecendo?"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Postando...' : 'Postar'}
        </button>
      </form>

      <div>
        {posts.map(post => (
          <div key={post.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
            <p>{post.content}</p>
            {post.imageUrl && <img src={post.imageUrl} alt="Post" />}
            <small>{new Date(post.createdAt).toLocaleDateString('pt-BR')}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeedComponent;
```

---

## 📊 RESUMO DE ENDPOINTS

| # | Método | Endpoint | Autenticação | Status |
|---|--------|----------|-------------|--------|
| 1 | POST | /auth/register | ❌ | ✅ |
| 2 | POST | /auth/login | ❌ | ✅ |
| 3 | GET | /users | ✅ | ✅ |
| 4 | GET | /users/:id | ✅ | ✅ |
| 5 | POST | /posts | ✅ | ✅ |
| 6 | GET | /posts | ✅ | ✅ |
| 7 | POST | /posts/:id/comment | ✅ | ✅ |
| 8 | POST | /devotionals | ✅ (Leader) | ✅ |
| 9 | GET | /devotionals | ✅ | ✅ |

---

## 🚀 DEPLOYMENT

### Local Development
```bash
npm run dev
# Servidor roda em http://localhost:3000
```

### Production
```bash
npm run prisma:migrate
npm start
```

### Docker
```bash
docker-compose up
```

---

## 📝 DADOS DE TESTE

**Church ID:** `cmofp5hpa0000p0ix3apqd9fz`

**Usuários Pré-Criados:**
1. **Leader**: `leader@youth.com` / `Password123`
2. **Member**: `member@youth.com` / `Password123`

**Roles Disponíveis:**
- `member` - Usuário comum
- `leader` - Líder (pode criar devotionals)
- `admin` - Administrador

---

## 🔗 DOCUMENTAÇÃO ADICIONAL

- Swagger Docs: `http://localhost:3000/api-docs`
- README: Ver `README.md`
- Arquitetura: Ver `ARCHITECTURE.md`

---

## ✅ API TESTADA E FUNCIONANDO!

**Todos os 9 endpoints testados e validados ✨**

Você está pronto para integrar no frontend! 🚀
