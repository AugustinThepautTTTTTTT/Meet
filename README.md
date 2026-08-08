# Meet

Meet is a proof-of-concept legal matching platform. Clients describe a legal
problem and receive a deterministic shortlist of relevant lawyers. Lawyers can
prepare, edit, publish, and update profiles, including practice details and an
educational post.

## What works

- Persistent client case submissions
- Deterministic practice-area matching (the future LLM integration point)
- Persistent lawyer profiles and publication
- Public lawyer profiles and consultation requests
- Nine seeded legal specialties
- Responsive client and lawyer experiences

## Architecture

- Next.js App Router on Vercel
- Two Neon Postgres databases:
  - `CLIENT_DATABASE_URL`: cases and consultation requests
  - `LAWYER_DATABASE_URL`: lawyer profiles and posts

## Local setup

```bash
npm install
cp .env.example .env.local
# Add both Neon connection strings to .env.local
npm run db:init
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

The current matching algorithm is intentionally deterministic. Replace
`detectPractice` and the ranking function in `app/page.tsx` when the LLM
matching service is ready.
