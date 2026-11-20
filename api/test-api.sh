#!/bin/bash

# Script de Teste de API - Youth Church Portal
# Este script testa todos os endpoints da API

echo "🧪 INICIANDO TESTES DE TODOS OS ENDPOINTS"
echo "=========================================="
echo ""

API="http://localhost:3000/api"

# 1. TESTE DE REGISTRO
echo "1️⃣ TESTANDO: POST /auth/register"
REGISTER=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test'$(date +%s)'@example.com","password":"Password123","churchId":"cmofp5hpa0000p0ix3apqd9fz"}')
echo "Resposta: $(echo $REGISTER | head -c 100)..."
echo ""

# 2. TESTE DE LOGIN
echo "2️⃣ TESTANDO: POST /auth/login"
LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"leader@youth.com","password":"Password123"}')
TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token obtido: $(echo $TOKEN | head -c 30)..."
echo ""

# 3. TESTE DE LISTAR USUÁRIOS
echo "3️⃣ TESTANDO: GET /users (requer autenticação)"
curl -s -X GET "$API/users" \
  -H "Authorization: Bearer $TOKEN" | head -c 150
echo ""
echo ""

# 4. TESTE DE OBTER USUÁRIO POR ID
echo "4️⃣ TESTANDO: GET /users/cmofp5hrt0002p0ixg690rlhu (requer autenticação)"
curl -s -X GET "$API/users/cmofp5hrt0002p0ixg690rlhu" \
  -H "Authorization: Bearer $TOKEN" | head -c 150
echo ""
echo ""

# 5. TESTE DE CRIAR POST
echo "5️⃣ TESTANDO: POST /posts (requer autenticação)"
POST_RESP=$(curl -s -X POST "$API/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Novo post de teste","imageUrl":"https://example.com/img.jpg"}')
POST_ID=$(echo $POST_RESP | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Resposta: $(echo $POST_RESP | head -c 150)..."
echo "Post ID obtido: $POST_ID"
echo ""

# 6. TESTE DE LISTAR POSTS
echo "6️⃣ TESTANDO: GET /posts (requer autenticação)"
curl -s -X GET "$API/posts" \
  -H "Authorization: Bearer $TOKEN" | head -c 150
echo ""
echo ""

# 7. TESTE DE ADICIONAR COMENTÁRIO
echo "7️⃣ TESTANDO: POST /posts/{id}/comment (requer autenticação)"
if [ ! -z "$POST_ID" ]; then
  curl -s -X POST "$API/posts/$POST_ID/comment" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"content":"Ótimo post!"}' | head -c 150
else
  echo "⚠️  Pulando - nenhum POST ID disponível"
fi
echo ""
echo ""

# 8. TESTE DE CRIAR DEVOTIONAL (somente LEADER)
echo "8️⃣ TESTANDO: POST /devotionals (requer role: leader)"
DEV_RESP=$(curl -s -X POST "$API/devotionals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Meditação do Dia","content":"Conteúdo da meditação","verse":"João 3:16"}')
echo "Resposta: $(echo $DEV_RESP | head -c 150)..."
echo ""

# 9. TESTE DE LISTAR DEVOTIONALS
echo "9️⃣ TESTANDO: GET /devotionals (requer autenticação)"
curl -s -X GET "$API/devotionals" \
  -H "Authorization: Bearer $TOKEN" | head -c 150
echo ""
echo ""

echo "=========================================="
echo "✅ TESTES CONCLUÍDOS!"
echo "=========================================="
