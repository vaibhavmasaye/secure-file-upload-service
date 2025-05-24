# Secure File Upload & Metadata Processing Microservice

A secure NestJS-based microservice for handling authenticated file uploads with background processing capabilities.

## Features

- JWT-based authentication
- Secure file upload with metadata
- Background processing using BullMQ
- PostgreSQL database integration
- File status tracking
- User-based access control

## Tech Stack

- Node.js (>=18)
- NestJS
- PostgreSQL with TypeORM
- BullMQ for background jobs
- JWT Authentication
- Multer for file handling

## Prerequisites

- Node.js (>=18)
- PostgreSQL
- Redis (for BullMQ)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```env
   # Application
   PORT=3000
   NODE_ENV=development

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=file_upload_db

   # JWT
   JWT_SECRET=your-secret-key
   JWT_EXPIRATION=1h

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # File Upload
   MAX_FILE_SIZE=5242880 # 5MB
   UPLOAD_DIRECTORY=./uploads
   ```

## Database Setup

1. Create PostgreSQL database:
   ```sql
   CREATE DATABASE file_upload_db;
   ```
2. The application will automatically create the required tables on startup.

## Running the Application

1. Development mode:
   ```bash
   npm run start:dev
   ```
2. Production mode:
   ```bash
   npm run build
   npm run start:prod
   ```

## API Documentation

### Authentication

#### Login
```
POST /auth/login
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### File Operations

#### Upload File
```
POST /upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: <file>
- title: "My File" (optional)
- description: "File description" (optional)

Response:
{
  "id": 1,
  "status": "uploaded",
  "title": "My File",
  "description": "File description"
}
```

#### Get File Status
```
GET /files/:id
Authorization: Bearer <token>

Response:
{
  "id": 1,
  "status": "processed",
  "title": "My File",
  "description": "File description",
  "originalFilename": "example.pdf",
  "extractedData": "...",
  "uploadedAt": "2023-07-20T10:00:00Z"
}
```

#### List Files (with pagination)
```
GET /files?page=1&limit=10
Authorization: Bearer <token>

Response:
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

## Security Features

- JWT-based authentication
- File size limits
- User-based access control
- Rate limiting
- Secure file storage

## Design Choices

1. **NestJS Framework**: Provides a robust architecture with dependency injection and modular design.
2. **TypeORM**: Offers type-safe database operations and easy migrations.
3. **BullMQ**: Reliable Redis-based queue for background processing.
4. **JWT Authentication**: Stateless authentication for scalability.

## Limitations & Assumptions

1. Files are stored locally (could be extended to use cloud storage)
2. Simple file processing simulation
3. Basic user management (no registration endpoint)
4. In-memory rate limiting (not suitable for distributed systems)

## Error Handling

The API returns appropriate HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Future Enhancements

1. Cloud storage integration
2. Advanced file processing
3. User registration
4. Distributed rate limiting
5. File type validation
6. Compression support