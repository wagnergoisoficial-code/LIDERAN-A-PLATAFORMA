# Youth Church Portal - Backend API

Production-ready SaaS backend for a Youth Church Portal using Node.js, Express, PostgreSQL, and Prisma.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Architecture](#architecture)

## ✨ Features

- ✅ JWT-based Authentication & Authorization
- ✅ Role-based Access Control (member, leader, admin)
- ✅ Church Management with Multi-tenant Support
- ✅ User Management (registration, login, profile)
- ✅ Social Feed (posts with comments)
- ✅ Devotional Messages (leader-only)
- ✅ File Upload Support
- ✅ Comprehensive Error Handling
- ✅ Clean Architecture Pattern
- ✅ Unit Tests
- ✅ Swagger API Documentation
- ✅ Graceful Shutdown

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (>=18) |
| Framework | Express.js 4.18 |
| Database | PostgreSQL |
| ORM | Prisma 5.7 |
| Authentication | JWT + Bcrypt |
| File Upload | Multer |
| API Docs | Swagger/OpenAPI |
| Testing | Jest |
| Environment | Dotenv |

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- PostgreSQL >= 12
- Git

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd youth-church-portal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure your values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/youth_church_portal
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRATION=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
CORS_ORIGIN=http://localhost:3000
SWAGGER_ENABLED=true
```

## 🗄 Database Setup

### 1. Generate Prisma Client

```bash
npm run prisma:generate
```

### 2. Run Migrations

```bash
npm run prisma:migrate
```

You'll be prompted to name the migration (e.g., "init").

### 3. Seed Sample Data (Optional)

```bash
npm run prisma:seed
```

This creates:
- 1 Church
- 2 Users (1 leader, 1 member)
- Sample posts, comments, and devotionals

### 4. View Database (Optional)

```bash
npm run prisma:studio
```

Opens Prisma Studio at http://localhost:5555

## ▶️ Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Server runs on `http://localhost:3000`

## 📚 API Endpoints

### Health Check

```http
GET /health
```

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "churchId": "church-uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123"
}
```

### Users

#### Get All Users (Requires Auth)
```http
GET /api/users
Authorization: Bearer <token>
```

#### Get User by ID (Requires Auth)
```http
GET /api/users/:id
Authorization: Bearer <token>
```

### Posts

#### Create Post (Requires Auth)
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "This is my post",
  "imageUrl": "https://example.com/image.jpg"
}
```

#### Get All Posts (Requires Auth)
```http
GET /api/posts
Authorization: Bearer <token>
```

#### Add Comment (Requires Auth)
```http
POST /api/posts/:id/comment
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great post!"
}
```

### Devotionals

#### Create Devotional (Leader Only)
```http
POST /api/devotionals
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Faith in Action",
  "content": "This week we explore how faith shapes our daily lives...",
  "verse": "Hebrews 11:1"
}
```

#### Get All Devotionals (Requires Auth)
```http
GET /api/devotionals
Authorization: Bearer <token>
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Watch Mode (Re-run on file changes)

```bash
npm run test:watch
```

### Test Files

- `tests/auth.service.test.js` - Auth service tests
- `tests/validation.util.test.js` - Validation utility tests
- `tests/register.dto.test.js` - Register DTO tests
- `tests/jwt.util.test.js` - JWT utility tests

## 📁 Project Structure

```
src/
├── config/                 # Configuration files
│   ├── environment.js      # Environment variables
│   ├── database.js         # Prisma setup
│   └── swagger.config.js   # Swagger configuration
├── modules/                # Feature modules
│   ├── auth/
│   │   ├── dtos/           # Data Transfer Objects
│   │   ├── repositories/   # Database access
│   │   ├── services/       # Business logic
│   │   └── controllers/    # HTTP handlers
│   ├── users/
│   ├── posts/
│   └── devotionals/
├── shared/                 # Shared utilities
│   ├── middlewares/        # Express middlewares
│   ├── errors/             # Error classes
│   └── utils/              # Helper utilities
├── routes/                 # API routes
├── app.js                  # Express app setup
└── server.js               # Server entry point
prisma/
├── schema.prisma           # Database schema
└── seed.js                 # Seed data
tests/                      # Unit tests
```

## 🏗 Architecture

### Clean Architecture Principles

1. **Separation of Concerns**
   - Controllers: HTTP request/response
   - Services: Business logic
   - Repositories: Data access
   - DTOs: Request validation

2. **Dependency Injection**
   - Manual DI pattern
   - Loose coupling
   - Easy testing

3. **Error Handling**
   - Custom error classes
   - Global error middleware
   - Consistent error responses

4. **Modularity**
   - Feature-based organization
   - Reusable middlewares
   - Shared utilities

### Data Flow

```
Request
  ↓
Route Handler
  ↓
Middleware (Auth, Role, Validation)
  ↓
Controller (HTTP layer)
  ↓
DTO (Validation)
  ↓
Service (Business logic)
  ↓
Repository (Database)
  ↓
Response
```

## 🔐 Authentication

### JWT Token Structure

Header:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Payload:
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "member",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Using Tokens

Include in every protected request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🛡 Roles & Permissions

| Role | Permissions |
|------|-----------|
| **member** | Register, login, read posts, comment, read devotionals |
| **leader** | All member permissions + create devotionals |
| **admin** | All permissions |

## 📋 DTO Validation Rules

### RegisterDto
- `name`: 2+ characters required
- `email`: Valid email format required
- `password`: Min 8 chars, uppercase, lowercase, digit
- `churchId`: Valid UUID required

### LoginDto
- `email`: Valid email format required
- `password`: Required (any length for comparison)

### CreatePostDto
- `content`: 3+ characters required

### CreateCommentDto
- `content`: Non-empty required

### CreateDevotionalDto
- `title`: 3+ characters required
- `content`: 10+ characters required

## 🚦 Environment Variables Reference

| Variable | Description | Example |
|----------|-----------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | JWT signing key | `your-secret-key-min-32-chars` |
| `JWT_EXPIRATION` | Token expiration | `7d` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `5242880` (5MB) |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` |
| `SWAGGER_ENABLED` | Enable Swagger docs | `true` |

## 📖 API Documentation

### Interactive Swagger UI

Visit: `http://localhost:3000/api-docs`

### OpenAPI JSON

Visit: `http://localhost:3000/api-docs.json`

## 🐛 Troubleshooting

### Database Connection Error

```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct.

### JWT Secret Not Set

```
error: Cannot read property 'sign' of undefined
```

**Solution:** Set JWT_SECRET in .env file.

### Port Already in Use

```
error: EADDRINUSE: address already in use :::3000
```

**Solution:** Change PORT in .env or kill process using port 3000.

### Prisma Migration Failed

```bash
npm run prisma:migrate -- --force
```

## 📝 Code Style

- **Naming**: camelCase for variables, PascalCase for classes
- **Functions**: Keep under 90 lines
- **Async**: Use async/await only
- **Error Handling**: Always try/catch in controllers
- **Comments**: Explain "why", not "what"

## 🔄 Deployment Checklist

- [ ] Update NODE_ENV to `production`
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Use production PostgreSQL database
- [ ] Set CORS_ORIGIN to frontend domain
- [ ] Enable HTTPS
- [ ] Set up logging/monitoring
- [ ] Configure database backups
- [ ] Test error handling
- [ ] Run full test suite
- [ ] Check API documentation

## 📞 Support

For issues or questions, please create an issue in the repository.

## 📄 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for Youth Church Portal**
