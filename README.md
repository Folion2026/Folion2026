# Folion

Folion uses the existing React/Vite interface with Supabase Auth, Postgres and private Storage behind a separate TypeScript API.

## Environment

Copy `.env.example` to `.env` and add these values:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
```

Only the two `VITE_` values are embedded in the browser build. `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY` and `GEMINI_MODEL` are server-only. The dedicated ingestion worker uses the Gemini variables; they are never sent to the browser or API responses.

## Supabase setup

1. Create a Supabase project.
2. In Authentication, enable email and disable public user sign-up. Configure the Site URL and allowed redirect URLs for `http://localhost:3001/home` and the production HTTPS origin.
3. Invite the first Owner from Authentication > Users. The first invited user to sign in creates the initial Folion workspace and becomes its Owner.
4. Get the project URL, publishable key and secret key from the project Connect/API Keys screen.
5. Install and authenticate the Supabase CLI, link the repository, then apply migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration enables RLS on all application tables and creates the private `project-assets` bucket. Do not create or edit production tables manually in the Supabase dashboard after adopting migrations.

## Run locally

```bash
cp .env.example .env
npm install
cd api && npm install && cd ..
cd worker && npm install && cd ..
```

Start the API and web app in separate terminals:

```bash
cd api
npm run dev
```

Start the ingestion worker in a third terminal:

```bash
cd worker
npm run build
npm start
```

```bash
npm run dev
```

Open `http://localhost:3001`. The Vite server proxies `/api` to `http://127.0.0.1:8787`.

The public landing page is `/`. It uses only the bundled static preview. `/sign-in` owns the invite-only magic-link screen, and every persistent workspace route (`/home`, `/projects`, `/studio`, `/folion-id` and project routes) is protected by `AuthGate`.

The first Owner workspace imports the existing Taverners Hill project and People fixtures once, into Postgres. Subsequent project, team, review and confidentiality changes autosave through the API. Categorized files are uploaded to private Storage with short-lived signed upload tokens. Text-based PDF reports can be analysed from Project Sources; the API creates a persistent job and the worker extracts page text, calls Gemini with strict JSON, validates every evidence quote against its cited page, and stores review candidates.

## VPS deployment

1. Install Docker Engine and the Compose plugin on the VPS.
2. Clone the repository to `/docker/folion` and create `/docker/folion/.env` from `.env.example` with production values.
3. Add the production HTTPS origin and `/home` redirect to Supabase Auth redirect URLs.
4. Apply migrations from a trusted workstation or CI using `npx supabase db push`.
5. Build and start the web, API and worker containers:

```bash
cd /docker/folion
docker compose config
docker compose up -d --build
docker compose ps
```

When run from `/docker/folion`, Compose automatically reads `/docker/folion/.env`, passes the two `VITE_` values as web-image build arguments, and passes server-only values only to the private API and worker containers. The Dockerfile deliberately fails the web build if either client value is empty. The web container listens on port `3001` and proxies `/api` internally to the API container. The API uses internal port `8787`; neither the API nor worker publishes a host port. Put your TLS reverse proxy in front of port `3001` only.

To deploy an update:

```bash
cd /docker/folion
git pull --ff-only
npx supabase db push
docker compose up -d --build
```

## Security model

- Login is email magic-link based with account creation disabled in the client (`shouldCreateUser: false`). Invitations are issued through Supabase or the Owner-only API invitation endpoint.
- Workspace roles are Owner, Editor and Viewer.
- RLS protects workspaces, profiles, projects, People, project teams, assets and audit events.
- The API independently checks workspace membership and mutation roles before using the server secret key.
- Project files live in a private bucket under workspace/project paths. The API returns time-limited signed URLs.
- Gemini extraction runs only in the worker against stored page-indexed text. Raw PDFs and Gemini credentials never enter the browser bundle.
- OCR, scanned PDFs, cross-document synthesis, embeddings, exports and public sharing are not implemented.

## Evidence ingestion architecture

```text
Browser → API → ingestion job → worker → PDF text extraction
                                      → Gemini → quote validation
                                      → Supabase → Sources review
```

The V1 worker accepts one selectable-text PDF per job, up to 20 MB and 100 pages. The browser polls persistent job state while Sources is open. Accepted facts and approved narratives appear in Knowledge; analysis alone never marks a project Ready for Studio.
