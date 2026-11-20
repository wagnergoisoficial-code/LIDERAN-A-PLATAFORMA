# 📖 GUIA DE USO - Novos Recursos

## 🎯 Sistema de Devocionais Diárias (24 horas)

### Como Funciona:
1. **Criação**: Líderes/admins criam devocionais
2. **Ativação**: Começa com status `isActive = true`
3. **Cronômetro**: Contador de horas (máx 24h)
4. **Expiração**: Após 24h, fica automaticamente inativa
5. **Reativação**: Líderes podem reativar manualmente

### Visualmente no Feed:
```
┌─────────────────────────────────────┐
│  Título do Devocional   [5h restantes] │  ← Badge com contador
│  Por: João Silva                    │
│                                      │
│ "João 3:16"                          │
│                                      │
│ Conteúdo do devocional...           │
│                                      │
│ [Marcar inativa]                    │  ← Ação do líder
└─────────────────────────────────────┘

Cores das Badges:
🟢 Verde    = Ativa (>6h restantes)
🟡 Amarelo  = Poucas horas (<6h)
🔴 Vermelho = Inativa ou expirada
```

### Ações do Líder/Admin:
- **Marcar como inativa**: Remove do feed imediatamente
- **Reativar**: Coloca de volta com 24h novamente
- **Histórico**: Vê todos os devocionais inativos na página

---

## 👤 Página de Perfil - Nova Rede Social!

### Acessar Perfil:
1. Clique em seu nome → "Meu Perfil"
2. Ou vá para `/profile/[user-id]`
3. Clique em membros na tabela para ver seus perfis

### Editar Seu Perfil:
1. Clique no botão **"Editar Perfil"**
2. Preencha os campos:
   - **Nome** (obrigatório)
   - **Idade** (opcional)
   - **Localização** (Ex: São Paulo, SP)
   - **Título/Cargo** (Ex: Estudante, Desenvolvedor)
   - **Bio** (até 500 caracteres)
   - **Habilidades** (separadas por vírgula)
   - **Tema de Fundo** (5 cores)

### Redes Sociais (Opcional):
Adicione seus links:
- 💬 **WhatsApp**: `https://wa.me/5511999999999`
- 💼 **LinkedIn**: `https://linkedin.com/in/seu-usuario`
- 📱 **Facebook**: `https://facebook.com/seu-usuario`
- 📸 **Instagram**: `https://instagram.com/seu-usuario`

Clique nos ícones para abrir em nova aba!

### Componentes do Perfil:

```
┌────────────────────────────────────┐
│  [Avatar]  João Silva              │  [Editar]
│            Desenvolvedor            │
│            🔷 Líder                 │
│            📍 São Paulo, SP          │
│            Membro desde Jan 2026    │
└────────────────────────────────────┘

SOBRE
Gosto de ajudar a comunidade e
desenvolver sistemas para a igreja.

HABILIDADES
[JavaScript] [Design] [Liderança]

REDES SOCIAIS
💬 💼 📱 📸

DISTINTIVOS
🏆 Top Commenter - 50+ comentários
🏆 Maior Fã - +100 reações
```

### Temas de Fundo:
- ⚪ **Claro** (padrão, branco)
- ⚫ **Escuro** (cinza escuro)
- 🔵 **Azul** (azul vibrante)
- 🟢 **Verde** (verde natural)
- 🟣 **Roxo** (roxo real)

---

## 🛡️ Bloqueio de Usuários

### Como Bloquear:
1. Acesse o perfil do usuário
2. Clique em "Bloquear usuário"
3. Este usuário não poderá ver seus posts/comentários

### Ver Bloqueados:
1. Vá para Configurações
2. Seção "Usuários Bloqueados"
3. Clique em "Desbloquear" para remover

---

## 🏆 Distintivos (Achievements)

Ganhe distintivos por:
- 🌟 **Top Commenter**: +50 comentários
- ❤️ **Maior Fã**: +100 reações em posts
- 📖 **Leitor Devoto**: Visualizou +20 devocionais
- 🎯 **Membro Ativo**: +30 dias consecutivos

Distintivos aparecem no seu perfil!

---

## 🔗 API Endpoints

### Perfil
```bash
GET    /users/:id                  # Ver perfil
PUT    /users/profile              # Atualizar perfil
```

### Redes Sociais
```bash
POST   /users/social-links         # Adicionar
GET    /users/:id/social-links     # Listar
DELETE /users/social-links/:linkId # Remover
```

### Distintivos
```bash
GET    /users/:id/achievements     # Listar
```

### Bloqueio
```bash
POST   /users/block/:blockedId     # Bloquear
DELETE /users/block/:blockedId     # Desbloquear
GET    /users/blocked              # Ver bloqueados
```

### Devocionais
```bash
PUT    /devotionals/:id/inactive   # Inativar
PUT    /devotionals/:id/reactivate # Reativar
```

---

## 💡 Dicas Úteis

1. **Bio Destacada**: Escreva uma bio interessante para outros conhecerem você
2. **Redes Sociais**: Conecte-se com a comunidade através das redes
3. **Habilidades**: Liste o que você sabe fazer para ajudar a comunidade
4. **Tema**: Escolha um tema que combine com sua personalidade!
5. **Distintivos**: Trabalhe para ganhar badges e ser reconhecido

---

## ❓ FAQ

**P: Quanto tempo uma devoção fica ativa?**
R: Exatamente 24 horas. Após isso, fica inativa automaticamente.

**P: Posso editar meu perfil depois?**
R: Sim! A qualquer momento. Clique em "Editar Perfil".

**P: Meu link de WhatsApp pode ser privado?**
R: Sim, use `https://wa.me/seu-numero-aqui`

**P: Posso ter múltiplas redes sociais?**
R: Sim! Adicione quantas quiser.

**P: Se bloquear alguém, ela sabe?**
R: Não, é silencioso.

**P: Como obtenho distintivos?**
R: Por atividades na comunidade (comentários, reações, etc).

---

**Status**: ✅ Tudo pronto para usar!
**Versão**: 2.0 (com Perfil + Devocionais Diárias)
**Última atualização**: 30 de Abril de 2026
