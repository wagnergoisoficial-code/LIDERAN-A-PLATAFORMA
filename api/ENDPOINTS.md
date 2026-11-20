# API Endpoints Reference - Youth Church Portal

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Endpoints Summary

### 🔐 Auth Module (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login user |

### 👥 Users Module (`/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | ✅ | Get all users in church |
| GET | `/users/:id` | ✅ | Get user by ID |

### 📝 Posts Module (`/posts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/posts` | ✅ | Create new post |
| GET | `/posts` | ✅ | Get all posts |
| POST | `/posts/:id/comment` | ✅ | Add comment to post |

### 📖 Devotionals Module (`/devotionals`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/devotionals` | ✅ | leader, admin | Create devotional |
| GET | `/devotionals` | ✅ | all | Get all devotionals |

---

## Detailed Endpoint Documentation

### POST /auth/register

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "churchId": "church-uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Validation Errors (400):**
- Name: 2+ characters required
- Email: Valid format required
- Password: Min 8 chars, uppercase, lowercase, digit
- Church ID: Required

---

### POST /auth/login

**Request:**
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- 401: Invalid credentials
- 400: Missing email or password

---

### GET /users

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### GET /users/:id

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- 404: User not found

---

### POST /posts

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "content": "This is my amazing post!",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "uuid",
    "content": "This is my amazing post!",
    "imageUrl": "https://example.com/image.jpg",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation:**
- Content: 3+ characters required

---

### GET /posts

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "content": "Post content",
      "imageUrl": null,
      "user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "comments": [
        {
          "id": "uuid",
          "content": "Great post!",
          "user": {
            "name": "Jane Smith"
          }
        }
      ],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### POST /posts/:id/comment

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "content": "Great post!"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "uuid",
    "content": "Great post!",
    "user": {
      "id": "uuid",
      "name": "Jane Smith"
    },
    "createdAt": "2024-01-15T10:35:00Z"
  }
}
```

**Errors:**
- 404: Post not found

---

### POST /devotionals

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Required Role:** `leader` or `admin`

**Request:**
```json
{
  "title": "Faith in Action",
  "content": "This week we explore how faith shapes our daily lives and strengthens our community...",
  "verse": "Hebrews 11:1"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Devotional created successfully",
  "data": {
    "id": "uuid",
    "title": "Faith in Action",
    "content": "This week we explore...",
    "verse": "Hebrews 11:1",
    "user": {
      "id": "uuid",
      "name": "John Leader"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- 403: Only leaders can create devotionals
- 400: Validation error

---

### GET /devotionals

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Devotionals retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Faith in Action",
      "content": "This week we explore...",
      "verse": "Hebrews 11:1",
      "user": {
        "id": "uuid",
        "name": "John Leader"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Common Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate resource)
- 500: Internal Server Error

---

## Testing with cURL

### 1. Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password123",
    "churchId": "church-123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### 3. Use Token in Request
```bash
# Save token from login response, then use it:
export TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing with Postman

1. Import Swagger JSON: `http://localhost:3000/api-docs.json`
2. Set `token` variable after login
3. Use `{{token}}` in Authorization header for protected endpoints

---

**Last Updated:** January 2024
