# Quick Start Guide - Youth Church Portal Backend

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create .env from template
cp .env.example .env

# Edit .env with your PostgreSQL URL:
# DATABASE_URL=postgresql://user:password@localhost:5432/youth_church_portal
```

### 3. Initialize Database
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Start Server
```bash
npm run dev
```

✅ Server is now running on `http://localhost:3000`

---

## 🔑 Test Credentials

After seeding, use these test accounts:

**Leader Account:**
- Email: `leader@youth.com`
- Password: `Password123`
- Role: `leader`

**Member Account:**
- Email: `member@youth.com`
- Password: `Password123`
- Role: `member`

---

## 🚀 First API Calls

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "leader@youth.com",
    "password": "Password123"
  }'
```

### 2. Get Token from Response
Copy the `data.token` value from the response.

### 3. Create a Post
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "Hello Church Community!"
  }'
```

### 4. Create Devotional (Leader Only)
```bash
curl -X POST http://localhost:3000/api/devotionals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Daily Devotion",
    "content": "This is a meaningful message for our youth.",
    "verse": "Psalm 23:1"
  }'
```

---

## 📖 API Documentation

Interactive Swagger UI: `http://localhost:3000/api-docs`

---

## 🧪 Run Tests

```bash
npm test
npm run test:watch
npm test -- --coverage
```

---

## 🐛 Common Issues

### PostgreSQL Connection Failed
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in .env
3. Verify username/password

### Port 3000 Already in Use
```bash
# Change PORT in .env or kill process
lsof -i :3000
kill -9 <PID>
```

### Prisma Migration Issues
```bash
npm run prisma:migrate -- --force
```

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `src/app.js` | Express app setup |
| `src/server.js` | Server startup |
| `src/config/` | Configuration |
| `src/modules/` | Feature modules |
| `prisma/schema.prisma` | Database schema |
| `.env` | Environment variables |

---

## ✨ Next Steps

1. ✅ Explore the code structure
2. ✅ Read the full [README.md](README.md)
3. ✅ Add more endpoints as needed
4. ✅ Write tests for your features
5. ✅ Deploy to production

---

**Happy coding! 🚀**
