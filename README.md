# Multi User Chat Bot
<img width="200" height="150" alt="Multi User Chat Bot 2" src="https://github.com/user-attachments/assets/6cd08a79-c22f-4671-a8bb-66670a23130f" />
<img width="200" height="150" alt="Multi User Chat Bot 1" src="https://github.com/user-attachments/assets/ae9492a7-e842-4de5-8e57-a269edf0f736" />

## Overview

Multi User Chat Bot is a production-oriented collaborative AI chat platform that enables multiple users to join a shared conversation using a passcode and interact with an AI assistant in real time.

The platform supports multi-user collaboration, invite-based access, AI-powered responses, realtime communication, presence tracking, typing indicators, secure session management, file attachments, and conversation persistence.

The application is designed with a service-oriented architecture, strong security controls, strict TypeScript standards, and production-grade backend practices.

---

## Features

### Collaboration

* Create shared chat rooms
* Join conversations using a passcode
* Multi-user participation
* Invite collaborators using secure invite links
* Shared AI conversation context

### AI Assistant

* OpenAI Responses API integration
* Shared conversation memory
* Product-focused assistance
* Context-aware responses
* Dynamic model configuration through environment variables

### Realtime Communication

* Server-Sent Events (SSE)
* Live message updates
* Presence tracking
* Typing indicators
* Automatic reconnection support

### Security

* Passcode hashing and verification
* Signed session cookies
* Request validation using Zod
* Distributed rate limiting
* Structured audit logging
* Request correlation IDs
* CSP and security headers
* Health and readiness monitoring

### Attachments

* File uploads
* Image uploads
* Attachment persistence
* Attachment previews
* Document text extraction support

### Persistence

* PostgreSQL database
* Prisma ORM
* Conversation history
* User management
* Audit trail storage

---

## Technology Stack

### Frontend

* Next.js 15
* React 19
* TypeScript
* CSS Modules / Modular CSS

### Backend

* Next.js Route Handlers
* Service Layer Architecture
* Zod Validation
* Prisma ORM

### Database

* PostgreSQL

### AI

* OpenAI Responses API

### Realtime

* Server-Sent Events (SSE)

### File Processing

* pdf-parse
* mammoth
* xlsx

### Security

* Secure Session Cookies
* Audit Logging
* Rate Limiting
* Content Security Policy (CSP)

### DevOps

* Docker
* Docker Compose

---

## Architecture

The project follows a layered architecture:

* UI Layer
* API Layer
* Service Layer
* Database Layer

Business logic is isolated within services, while API routes remain thin and focused on validation and orchestration.

---

## Key Capabilities

* Shared AI conversations
* Multi-user collaboration
* Secure invite-based access
* Persistent chat history
* Realtime updates
* Presence tracking
* Typing indicators
* File and image attachments
* Audit logging
* Production-grade security

---

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Run Type Checking

```bash
npm run typecheck
```

### Prisma Migration

```bash
npx prisma migrate dev
npx prisma generate
```

### Docker

```bash
docker compose up -d
```

---
## .env (format)

ADMIN_AUDIT_API_KEY=

OPENAI_API_KEY=

OPENAI_MODEL=gpt-5.4

PASSCODE_PEPPER=

CHAT_SESSION_SECRET=

JOIN_ROOM_RATE_LIMIT_PER_MINUTE=10

SEND_MESSAGE_RATE_LIMIT_PER_MINUTE=20

DATABASE_URL=

## Author

**Dr. Rahul Sarkar**
