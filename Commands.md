# COMMANDS.md

## Environment Setup

Create a `.env` file in the project root.

```env
DATABASE_URL="postgresql://multiuserchatbot:multiuserchatbot_password@localhost:5433/multiuserchatbot"

OPENAI_API_KEY="your_openai_api_key"
OPENAI_MODEL="gpt-4.1-mini"

PASSCODE_PEPPER="replace_with_long_random_secret"
CHAT_SESSION_SECRET="replace_with_long_random_secret"

ADMIN_AUDIT_API_KEY="replace_with_long_random_secret"

JOIN_ROOM_RATE_LIMIT_PER_MINUTE=10
SEND_MESSAGE_RATE_LIMIT_PER_MINUTE=20

NODE_ENV=development
```

---

# Initial Installation

Install dependencies:

```bash
npm install
```

Install file processing libraries:

```bash
npm install pdf-parse mammoth xlsx
```

---

# PostgreSQL (Docker)

Start PostgreSQL:

```bash
docker compose up -d
```

Verify:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs postgres
```

Stop:

```bash
docker compose down
```

---

# Prisma

Generate Prisma Client:

```bash
npx prisma generate
```

Create migration:

```bash
npx prisma migrate dev --name init
```

Create migration after schema changes:

```bash
npx prisma migrate dev --name migration_name
```

Open Prisma Studio:

```bash
npx prisma studio
```

Reset database:

```bash
npx prisma migrate reset
```

---

# Development

Start application:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start production build:

```bash
npm run start
```

---

# Quality Checks

TypeScript validation:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

---

# Docker Application

Build image:

```bash
docker compose build
```

Build without cache:

```bash
docker compose build --no-cache
```

Start containers:

```bash
docker compose up -d
```

View running containers:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

Stop containers:

```bash
docker compose down
```

---

# Upload Feature Dependencies

Install PDF support:

```bash
npm install pdf-parse
```

Install DOCX support:

```bash
npm install mammoth
```

Install Excel support:

```bash
npm install xlsx
```

Install all together:

```bash
npm install pdf-parse mammoth xlsx
```

---

# Git

Check status:

```bash
git status
```

Add changes:

```bash
git add .
```

Commit:

```bash
git commit -m "your message"
```

Push:

```bash
git push origin develop
```

Pull latest:

```bash
git pull origin develop
```

---

# Useful Cleanup

Remove node_modules:

```bash
rm -rf node_modules
```

Fresh install:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

# Health Checks

Liveness endpoint:

```bash
curl http://localhost:3000/api/health/live
```

Readiness endpoint:

```bash
curl http://localhost:3000/api/health/ready
```

---

# Project Workflow

1. Update code.
2. Run typecheck.
3. Run lint.
4. Create Prisma migration if schema changed.
5. Generate Prisma client.
6. Verify application locally.
7. Commit.
8. Push to develop.

---

Author: Dr. Rahul Sarkar
