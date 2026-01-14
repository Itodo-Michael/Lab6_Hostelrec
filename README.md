# HostelRec - Hostel Management System

A full-stack hostel management system built with FastAPI backend and React frontend, featuring a comprehensive authentication and authorization system.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Authentication System](#authentication-system)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [Technology Stack](#technology-stack)
- [Development](#development)

## 🎯 Overview

HostelRec is a modern hostel management system that provides:
- Room booking and management
- Guest check-in/check-out
- Staff management
- Order management (food & drinks)
- Customer portal
- Comprehensive authentication and authorization system

## ✨ Features

### Core Features
- **Room Management**: Browse, book, and manage hostel rooms
- **Guest Management**: Check-in/check-out functionality
- **Order System**: Food and drink ordering for guests
- **Staff Dashboard**: Administrative tools for staff members
- **Customer Portal**: Self-service portal for guests
- **Multi-language Support**: English and Russian

### Authentication & Security Features
- **User Authentication**: Secure login with JWT tokens
- **Password Hashing**: pbkdf2_sha256 with automatic salt generation
- **Session Management**: Track and manage user sessions
- **Multi-Factor Authentication (MFA)**: Optional two-factor authentication via email
- **Password Recovery**: Secure password reset functionality
- **Role-Based Access Control**: Different access levels (customer, receptionist, manager, cleaner)
- **Session Tracking**: Monitor active sessions with IP and device information

## 📁 Project Structure

```
HostelRec/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       └── auth.py          # Authentication endpoints
│   │   ├── core/
│   │   │   └── security.py          # Security utilities (hashing, JWT)
│   │   ├── models/
│   │   │   ├── user.py              # User model
│   │   │   └── session.py           # Session model
│   │   ├── schemas/
│   │   │   └── auth.py              # Pydantic schemas
│   │   ├── services/
│   │   │   ├── session_service.py   # Session management
│   │   │   ├── mfa_service.py       # MFA functionality
│   │   │   └── password_reset_service.py  # Password recovery
│   │   └── main.py                  # FastAPI application
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── PasswordChangePage.tsx
│   │   │   ├── MFAPage.tsx
│   │   │   ├── SessionsPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useAuthStore.ts
│   │   └── services/
│   │       └── api.ts
│   ├── package.json
│   └── Dockerfile
├── sql/                              # Database scripts
├── docker-compose.yml
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Hostelrec
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:5432

### Default Credentials

The system automatically creates a default manager account on first startup. Check the backend logs for credentials.

## 🔐 Authentication System

### Overview

The authentication system implements all requirements from Lab Work #6:
- User database with roles
- Password hashing with salt
- JWT token-based authentication
- Role-based authorization
- Session management
- Multi-factor authentication (MFA)
- Password recovery

### User Roles

- **customer**: Regular guest users
- **receptionist**: Front desk staff
- **manager**: Administrative staff
- **cleaner**: Cleaning staff

### Password Security

- **Algorithm**: pbkdf2_sha256
- **Salt**: Automatically generated for each password
- **Storage**: Only hashed passwords are stored in the database

### Session Management

- Sessions are tracked in the `user_sessions` table
- Each session includes:
  - IP address
  - User agent (device/browser info)
  - Creation time
  - Last activity time
  - Expiration time
- Users can view and manage their active sessions

## 📡 API Documentation

### Authentication Endpoints

#### Public Endpoints

**POST `/auth/token`** - Login
```json
// Request (form-data)
username: "user@example.com"
password: "password123"

// Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "customer",
  "mfa_required": false
}
```

**POST `/auth/signup`** - Register new user
```json
// Request
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "password": "password123"
}

// Response
{
  "access_token": "...",
  "token_type": "bearer",
  "role": "customer"
}
```

**POST `/auth/forgot-password`** - Request password reset
```json
// Request
{
  "email": "user@example.com"
}

// Response
{
  "message": "If an account with this email exists, a password reset code has been sent."
}
```

**POST `/auth/reset-password`** - Reset password with code
```json
// Request
{
  "email": "user@example.com",
  "code": "ABC12345",
  "new_password": "newpassword123"
}

// Response
{
  "message": "Password reset successfully. Please login with your new password."
}
```

#### Protected Endpoints (Require Authentication)

**POST `/auth/change-password`** - Change password
```json
// Request
{
  "old_password": "oldpassword",
  "new_password": "newpassword123"
}

// Response
{
  "message": "Password changed successfully. Please login again."
}
```

**POST `/auth/logout`** - Logout
```json
// Response
{
  "message": "Logged out successfully"
}
```

**GET `/auth/me`** - Get current user info
```json
// Response
{
  "id": 1,
  "username": "user@example.com",
  "role": "customer",
  "mfa_enabled": false,
  "active_sessions_count": 2
}
```

**GET `/auth/sessions`** - Get active sessions
```json
// Response
[
  {
    "id": 1,
    "created_at": "2025-12-08T17:00:00Z",
    "last_activity": "2025-12-08T18:00:00Z",
    "expires_at": "2025-12-08T19:00:00Z",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "is_current": true
  }
]
```

**DELETE `/auth/sessions/{session_id}`** - End specific session
```json
// Response
{
  "message": "Session ended successfully"
}
```

#### MFA Endpoints

**POST `/auth/mfa/enable`** - Enable MFA
```json
// Request
{
  "password": "userpassword"
}

// Response
{
  "message": "MFA enabled successfully",
  "secret": "secret_key_here"
}
```

**POST `/auth/mfa/verify`** - Verify MFA code
```json
// Request
{
  "code": "123456"
}

// Response
{
  "message": "MFA code verified successfully"
}
```

**POST `/auth/mfa/disable`** - Disable MFA
```json
// Request
{
  "password": "userpassword"
}

// Response
{
  "message": "MFA disabled successfully"
}
```

### Using the API

All protected endpoints require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/auth/me
```

## 🔒 Security Features

### Password Security
- Passwords are hashed using pbkdf2_sha256
- Each password gets a unique salt automatically
- Passwords are never stored in plain text
- Minimum password length: 6 characters

### Token Security
- JWT tokens with expiration (default: 60 minutes)
- Tokens are signed with a secret key
- Tokens include user role for authorization

### Session Security
- Sessions are tracked with IP and device information
- Users can view all active sessions
- Users can terminate specific sessions
- All sessions are terminated when password is changed

### Multi-Factor Authentication
- Optional MFA via email codes
- 6-digit codes with 10-minute expiration
- Codes are single-use only

### Password Recovery
- Secure password reset via email codes
- 8-character alphanumeric codes
- 30-minute expiration
- Codes are single-use only
- All sessions terminated after password reset

### Security Best Practices
- Rate limiting recommended for production
- HTTPS required in production
- Secret keys should be stored in environment variables
- Email service integration needed for production MFA

## 🛠 Technology Stack

### Backend
- **FastAPI** 0.111.0 - Modern Python web framework
- **SQLAlchemy** 2.0.30 - ORM with async support
- **PostgreSQL** 15 - Database
- **asyncpg** 0.29.0 - Async PostgreSQL driver
- **python-jose** 3.3.0 - JWT handling
- **passlib** 1.7.4 - Password hashing

### Frontend
- **React** 18.2.0 - UI library
- **TypeScript** 5.4.5 - Type safety
- **Vite** 5.2.12 - Build tool
- **Tailwind CSS** 3.4.4 - Styling
- **Framer Motion** 11.2.9 - Animations
- **React Router** 6.23.1 - Routing
- **Zustand** 4.5.5 - State management
- **i18next** 23.11.5 - Internationalization
- **Axios** 1.7.2 - HTTP client

## 🗄 Database Schema

### Users Table (`hostel_users`)
```sql
CREATE TABLE hostel_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255)
);
```

### Sessions Table (`user_sessions`)
```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES hostel_users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

## 🧪 Testing

### Manual Testing

1. **Test Authentication Flow**
   ```bash
   # Register a new user
   curl -X POST http://localhost:8000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","full_name":"Test User","password":"test123"}'
   
   # Login
   curl -X POST http://localhost:8000/auth/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=test@example.com&password=test123"
   ```

2. **Test Password Change**
   ```bash
   curl -X POST http://localhost:8000/auth/change-password \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"old_password":"test123","new_password":"newpass123"}'
   ```

3. **Test Password Recovery**
   ```bash
   # Request reset code
   curl -X POST http://localhost:8000/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   
   # Reset password (check console for code)
   curl -X POST http://localhost:8000/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","code":"ABC12345","new_password":"newpass123"}'
   ```

## 📝 Environment Variables

### Backend
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/hostelrec
AUTH_SECRET_KEY=your-secret-key-here
AUTH_TOKEN_EXPIRE_MINUTES=60
AUTH_ALGORITHM=HS256
SUPER_SECRET_PHRASE=your-secret-phrase
```

### Frontend
```env
VITE_API_URL=http://localhost:8000
```

## 🚧 Development

### Running in Development Mode

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

The application automatically creates necessary tables on startup. For production, consider using Alembic for proper migrations.

## 📚 Additional Documentation

- [Authentication System Documentation](./backend/AUTHENTICATION_SYSTEM.md) - Detailed authentication system documentation (in Russian)
- [Database Relationships](./DATABASE_RELATIONSHIPS.md) - Database schema relationships

## 🔐 Security Recommendations for Production

1. **Use HTTPS**: Always use HTTPS in production
2. **Change Secret Keys**: Update `AUTH_SECRET_KEY` and `SUPER_SECRET_PHRASE`
3. **Email Service**: Integrate real email service (SendGrid, AWS SES) for MFA and password recovery
4. **Rate Limiting**: Implement rate limiting for login and password reset endpoints
5. **Redis**: Use Redis for session storage instead of in-memory storage
6. **Monitoring**: Add logging and monitoring for security events
7. **CORS**: Configure CORS properly for production domains
8. **Input Validation**: Ensure all inputs are properly validated
9. **SQL Injection**: Use parameterized queries (already implemented via SQLAlchemy)
10. **XSS Protection**: Frontend should sanitize user inputs

## 📄 License

This project is part of a coursework assignment.

## 👥 Authors

Developed as part of Lab Work #6 - Authentication and Authorization Systems.

## 🙏 Acknowledgments

- FastAPI documentation
- React documentation
- PostgreSQL documentation
