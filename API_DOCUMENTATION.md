# API Documentation

Base URL: `http://localhost:3000`

## Authentication

### Register User

```http
POST /auth/register
```

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "securePass123",
  "email": "john@example.com"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "createdAt": "2024-01-20T10:30:45.123Z"
}
```

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "securePass123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiam9obl9kb2UiLCJpYXQiOjE3MDU3NDg2NDUsImV4cCI6MTcwNTgzNTA0NX0"
}
```

## File Operations

All file operations require authentication. Include the JWT token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Upload File

```http
POST /files/upload
Content-Type: multipart/form-data
```

**Request:**
Multipart form data with:
- `file`: File to upload (binary)
- `description`: File description (optional)
- `tags`: Array of tags (optional)

**Example using curl:**
```bash
curl -X POST http://localhost:3000/files/upload \
  -H "Authorization: Bearer your_jwt_token" \
  -F "file=@document.pdf" \
  -F "description=Important document" \
  -F "tags=[\"work\",\"2024\"]" 
```

**Response (201 Created):**
```json
{
  "id": 1,
  "filename": "1705748645123_document.pdf",
  "originalName": "document.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "description": "Important document",
  "tags": ["work", "2024"],
  "uploadedAt": "2024-01-20T10:30:45.123Z",
  "userId": 1
}
```

### Get Single File

```http
GET /files/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "filename": "1705748645123_document.pdf",
  "originalName": "document.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "description": "Important document",
  "tags": ["work", "2024"],
  "uploadedAt": "2024-01-20T10:30:45.123Z",
  "userId": 1
}
```

### List Files

```http
GET /files?page=1&limit=10&sort=uploadedAt&order=desc
```

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Items per page (optional, default: 10)
- `sort`: Sort field (optional, default: uploadedAt)
- `order`: Sort order (optional, default: desc)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 2,
      "filename": "1705748700456_presentation.pptx",
      "originalName": "presentation.pptx",
      "size": 2097152,
      "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "description": "Q1 Presentation",
      "tags": ["presentation", "q1"],
      "uploadedAt": "2024-01-20T10:31:40.456Z",
      "userId": 1
    },
    {
      "id": 1,
      "filename": "1705748645123_document.pdf",
      "originalName": "document.pdf",
      "size": 1048576,
      "mimeType": "application/pdf",
      "description": "Important document",
      "tags": ["work", "2024"],
      "uploadedAt": "2024-01-20T10:30:45.123Z",
      "userId": 1
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

## Error Responses

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Invalid authentication token",
  "error": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "File with ID 999 not found",
  "error": "Not Found"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email address"
    },
    {
      "field": "password",
      "message": "must be at least 8 characters long"
    }
  ]
}
```

**413 Payload Too Large**
```json
{
  "statusCode": 413,
  "message": "File size exceeds the 10MB limit",
  "error": "Payload Too Large"
}
```