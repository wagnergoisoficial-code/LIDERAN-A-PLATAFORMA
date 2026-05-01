# Architecture & Design Document - Youth Church Portal

## 📐 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Application                     │
└────────────────────┬────────────────────────────────────┘
                     │ REST API (JSON/HTTP)
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer / Router                 │
└────────────────────┬────────────────────────────────────┘
                     │
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Express  │   │ Express  │   │ Express  │
│ Server 1 │   │ Server 2 │   │ Server N │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     └──────────────┼──────────────┘
                    ↓
         ┌──────────────────────┐
         │   PostgreSQL DB      │
         │   (Connection Pool)  │
         └──────────────────────┘
```

---

## 🏗 Layered Architecture

### Layer 1: HTTP / Presentation Layer
- **File:** `src/routes/*.js`
- **Responsibility:** Route definition, HTTP binding
- **Pattern:** Express Router
- **Example:** `auth.register.js`

### Layer 2: Controller / Request Handler
- **File:** `src/modules/*/controllers/*.js`
- **Responsibility:** Parse request, call service, format response
- **Pattern:** HTTP → DTO → Service → Response
- **Example:** `AuthController`

### Layer 3: DTO / Validation Layer
- **File:** `src/modules/*/dtos/*.js`
- **Responsibility:** Input validation, data transformation
- **Pattern:** Value Object with validation
- **Example:** `RegisterDto`

### Layer 4: Business Logic / Service Layer
- **File:** `src/modules/*/services/*.js`
- **Responsibility:** Business rules, orchestration
- **Pattern:** Singleton-like services
- **Example:** `AuthService`

### Layer 5: Data Access / Repository Layer
- **File:** `src/modules/*/repositories/*.js`
- **Responsibility:** Database queries, ORM abstraction
- **Pattern:** Repository Pattern
- **Example:** `UserRepository`

### Layer 6: Database / Persistence Layer
- **Tool:** Prisma ORM
- **Database:** PostgreSQL
- **Schema:** `prisma/schema.prisma`

---

## 🔄 Request/Response Flow

```
1. REQUEST ARRIVES
   └─ POST /api/auth/register
   └─ Headers: { "Content-Type": "application/json" }
   └─ Body: { "name": "...", "email": "...", "password": "...", "churchId": "..." }

2. ROUTE HANDLER (auth.register.js)
   └─ Express Router matches URL pattern
   └─ Passes to Controller

3. MIDDLEWARE CHAIN
   └─ Authentication Middleware (if required)
   └─ Authorization Middleware (if required)
   └─ Error handling wrapper

4. CONTROLLER (AuthController.register)
   └─ Receives request
   └─ Creates DTO from request.body
   └─ Calls DTO.validate()
   └─ If valid → calls service.register()
   └─ Catches errors → passes to error middleware

5. DTO VALIDATION (RegisterDto.validate)
   └─ Validates each field
   └─ Throws ValidationError if invalid
   └─ Returns true if valid

6. SERVICE (AuthService.register)
   └─ Checks if email exists (via repository)
   └─ Hashes password with bcrypt
   └─ Creates user record (via repository)
   └─ Generates JWT token
   └─ Returns formatted response

7. REPOSITORY (UserRepository.create)
   └─ Calls Prisma ORM: prisma.user.create()
   └─ Returns created user record
   └─ Handles DB errors

8. RESPONSE
   └─ Service returns data to Controller
   └─ Controller sends HTTP 201 response
   └─ JSON: { success: true, data: {...}, token: "..." }

9. ERROR HANDLING (if error occurs)
   └─ Any error → caught by controller try/catch
   └─ Passed to error middleware
   └─ Error middleware formats response
   └─ Returns HTTP 400/401/403/404/500 with error message
```

---

## 🏢 Module Structure

### Each Module Contains:

```
src/modules/<module>/
├── controllers/       # HTTP Handlers
├── dtos/            # Data Validation
├── services/        # Business Logic
├── repositories/    # Database Access
└── README.md        # Module Documentation (optional)
```

### Module Example: Auth

```
src/modules/auth/
├── controllers/
│   └── AuthController.js
├── dtos/
│   ├── RegisterDto.js
│   └── LoginDto.js
├── repositories/
│   └── UserRepository.js
└── services/
    └── AuthService.js
```

---

## 🔐 Security Architecture

### Authentication Flow

```
User Input (email + password)
         ↓
    Login Endpoint
         ↓
    UserRepository.findByEmail()
         ↓
    bcrypt.compare(inputPassword, hashedPassword)
         ↓
    If Match:
      - Generate JWT with user payload
      - Return token
    Else:
      - Throw AuthenticationError
```

### Authorization Flow

```
Request with Token
         ↓
    Auth Middleware
         ↓
    JWT.verify(token)
         ↓
    Extract user data from payload
         ↓
    Set req.user
         ↓
    Next route handler
         ↓
    Role Middleware (if needed)
         ↓
    Check req.user.role against allowedRoles
         ↓
    If Match: Continue
    Else: Throw AuthorizationError
```

### Password Security

```
User Password Input
         ↓
    bcrypt.hash(password, 10)
    (10 = salt rounds)
         ↓
    Store hashed password in database
    (Never store plaintext!)
         ↓
    On Login:
      bcrypt.compare(inputPassword, storedHash)
         ↓
    If Match: User authenticated
    Else: Reject
```

---

## 📊 Database Design

### Entity Relationship Diagram

```
┌─────────────────────┐
│     churches        │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ created_at          │
└──────────┬──────────┘
           │ (1:N)
           │
    ┌──────┴──────┐
    ↓             ↓
┌──────────────┐ ┌──────────────┐
│    users     │ │    posts     │
├──────────────┤ ├──────────────┤
│ id (PK)      │ │ id (PK)      │
│ email        │ │ content      │
│ password     │ │ image_url    │
│ role         │ │ user_id (FK) │
│ church_id    │ │ church_id    │
│ (FK)         │ │ (FK)         │
└──────┬───────┘ └────┬─────────┘
       │              │
       │         (1:N)│
       │              ↓
       │        ┌──────────────┐
       │        │   comments   │
       │        ├──────────────┤
       │        │ id (PK)      │
       │        │ content      │
       │        │ user_id (FK) │
       │        │ post_id (FK) │
       │        └──────────────┘
       │
       └──────────┐
                  ↓
       ┌──────────────────────┐
       │   devotionals        │
       ├──────────────────────┤
       │ id (PK)              │
       │ title                │
       │ content              │
       │ verse                │
       │ user_id (FK)         │
       │ church_id (FK)       │
       └──────────────────────┘
```

### Key Design Decisions

1. **Soft Delete Not Used**
   - Direct delete cascades for simplicity
   - Adjust based on compliance requirements

2. **Indexes on Foreign Keys**
   - Improves query performance
   - Applied automatically via Prisma

3. **Timestamps**
   - `created_at`: Immutable creation time
   - `updated_at`: Updated on record modification

4. **Role Column (String)**
   - Could be separate role table for scalability
   - Kept simple for MVP

---

## 🧪 Error Handling Strategy

### Error Hierarchy

```
Error
 ├── AppError (custom base)
 │    ├── ValidationError (400)
 │    ├── AuthenticationError (401)
 │    ├── AuthorizationError (403)
 │    ├── NotFoundError (404)
 │    └── ConflictError (409)
 └── System Errors
      ├── TypeError
      ├── ReferenceError
      └── etc.
```

### Error Flow

```
Error Thrown
    ↓
Controller try/catch
    ↓
Pass to next(error)
    ↓
Error Middleware
    ↓
Standardize error format
    ↓
Log (if needed)
    ↓
Send JSON response with statusCode
```

### Error Response Example

```json
{
  "success": false,
  "message": "Email already registered",
  "statusCode": 409,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🔌 Dependency Injection Pattern

### Manual DI Implementation

```javascript
// In route file
const UserRepository = require('../repositories/UserRepository');
const AuthService = require('../services/AuthService');
const AuthController = require('../controllers/AuthController');

// Create instances
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

// Bind to route
router.post('/', (req, res, next) => {
  authController.register(req, res, next);
});
```

### Benefits

- **Testability:** Easy to mock dependencies
- **Loose Coupling:** Services don't create their dependencies
- **Flexibility:** Can swap implementations

---

## 📈 Scalability Considerations

### Current Design Supports:

1. **Horizontal Scaling**
   - Stateless services
   - JWT for distributed authentication
   - Database connection pooling

2. **Vertical Scaling**
   - Modular structure allows optimization
   - Database indexes for query performance

3. **Future Enhancements**

   ```
   - Add Redis for caching
   - Message queue for async tasks
   - Microservices by module
   - API Gateway for routing
   - Rate limiting middleware
   - Request/Response logging
   - APM (Application Performance Monitoring)
   ```

---

## 🔄 Transaction Management

### Current Implementation

```javascript
// Single-entity transactions (implicit)
await prisma.user.create({
  data: { ... }
});

// Multi-step operations
// Could use Prisma.$transaction() for atomic operations
```

### Future Enhancement

```javascript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ ... });
  await tx.church.update({
    where: { id: churchId },
    data: { userCount: { increment: 1 } }
  });
});
```

---

## 📝 Logging Strategy

### Current: Console Logs in Development

```javascript
if (config.isDevelopment()) {
  console.log(`${req.method} ${req.path}`);
}
```

### Production Recommendation

```javascript
// Add Winston or Pino logger
// Log levels: error, warn, info, debug
// Log to: console + file + cloud service
// Include: timestamp, request ID, user ID, action
```

---

## 🚀 Deployment Architecture

### Development
```
npm run dev
→ Nodemon watches file changes
→ Server auto-restarts
```

### Production
```
npm start
→ Single process
→ Reverse proxy (nginx) for load balancing
→ Process manager (PM2) for restart on crash
→ Database connection pooling
→ Environment-specific config
```

### Docker Deployment
```
docker-compose up
→ PostgreSQL container
→ Node.js app container
→ Shared network
→ Volume mounts for persistence
```

---

## 🎯 SOLID Principles Application

### Single Responsibility
- Each class has one reason to change
- Controllers only handle HTTP
- Services only handle business logic
- Repositories only handle data access

### Open/Closed
- Services accept repositories as dependencies
- Can extend functionality without modification

### Liskov Substitution
- Repositories can be swapped with mocks

### Interface Segregation
- DTOs only expose needed properties
- Repositories have focused methods

### Dependency Inversion
- Services depend on abstractions (repository interface)
- Not on concrete implementations

---

## 📊 Performance Considerations

### Query Optimization

```javascript
// Avoid N+1 queries
posts = await prisma.post.findMany({
  include: {
    user: true,           // ✅ Join in single query
    comments: true
  }
});

// Instead of
posts = await prisma.post.findMany();
// Then looping and querying user for each post
```

### Indexing Strategy

```prisma
model User {
  id    String @id @default(cuid())
  email String @unique          // Indexed
  churchId String
  
  @@index([churchId])           // Composite queries faster
}
```

---

## 🔒 Security Checklist

- [x] Password hashing (bcrypt)
- [x] JWT for stateless auth
- [x] Role-based access control
- [x] Input validation
- [x] Error message sanitization
- [ ] HTTPS/TLS in production
- [ ] Rate limiting
- [ ] SQL injection prevention (Prisma handles)
- [ ] XSS protection (depends on frontend)
- [ ] CSRF tokens (if forms needed)
- [ ] API key rotation
- [ ] Sensitive data logging protection

---

## 🧮 Complexity Analysis

### Time Complexity

| Operation | Complexity |
|-----------|-----------|
| Register | O(n) - password hashing |
| Login | O(n) - password comparison |
| Get all posts | O(m) - database query |
| Create post | O(1) - single insert |

### Space Complexity
- Typical O(n) for data retrieval
- Can optimize with pagination

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Architecture:** Clean Layered Architecture  
**Status:** Production-Ready MVP
