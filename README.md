# Folion MVP

A clickable single-page MVP for capturing, finding, curating and reusing a design practice's project memory. Built with React, TypeScript, Vite, Tailwind CSS and local JSON/state only.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Production build

```bash
npm run build
npm run preview
```

## Docker

```bash
docker compose up -d --build
```

The production Nginx container serves the SPA on port `3001`, including client-side route fallback.

## Product scope

- Public landing, Magazine and company profile
- Logged-in Home with Project of the Day
- Live natural-language-style search across project facts and story text
- One-click selection with bulk project actions
- Local project creation and explicit project edit mode
- Create/rename collections and add/remove projects
- Studio mock capability statement generation
- Folion ID practice and people profile

All records live in `src/data` and are shaped for later replacement by an API. Authentication, persistence, database, payments and live AI are intentionally out of scope.
