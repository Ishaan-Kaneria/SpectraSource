# SpectraSource

SpectraSource is a generative AI engine that transforms one source (text, document, image, video or prompt) into a complete, omnichannel asset kit. Built for Smart India Hackathon problem **SIH26154: Gen AI Platform for Automated Content Transformation** (NTRO) by team **Out of Tokens**.

An operator pastes or uploads source content, picks one or more output formats, sets audience, tone, language, detail, objective and style, and gets every format generated from the same source:

| Format | What you get |
|---|---|
| Video package | Script, storyboard, scene descriptions, narration, subtitles, visual recommendations |
| LinkedIn post | Hook, body, call to action, hashtags |
| Twitter/X | Tweet or thread, each tweet within 280 characters |
| Advisory | Severity, summary, affected systems, sections, recommendations |
| Infographic | Headline, key stats, sections, layout and palette |
| Executive summary | Bottom line, key points, implications, actions |
| Presentation | Slides with bullets, speaker notes and visual suggestions |

Each output can be downloaded as a ready-to-use file: `.pptx` slides with speaker notes, `.docx` advisories and briefings, `.srt` subtitles, an HTML infographic preview, or Markdown.

Every job and every generated artefact is recorded in a **hash-chained audit log** (`GET /api/audit/verify` detects any tampering), and each artefact carries a SHA-256 content hash.

## Repository layout

```
backend/             FastAPI API, LLM provider layer, ingestion, generators, audit chain, tests
frontend/            React + Vite + TypeScript + Tailwind dashboard
docker-compose.yml   Postgres (pgvector) + backend
netlify.toml         Frontend deploy config for Netlify
```

## Quick start

Prerequisites: Python 3.12+, Node 22+, and either Docker or a local PostgreSQL 16.

```bash
cp .env.example .env          # defaults use the offline "mock" LLM, no key needed
```

**Option A: Docker for database and backend**

```bash
docker compose up --build     # API on http://localhost:8000
```

**Option B: run the backend directly**

```bash
docker compose up -d db       # or point DATABASE_URL at your own Postgres
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --env-file ../.env
```

**Frontend**

```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm install
npm run dev                   # http://localhost:5173
```

API docs are at http://localhost:8000/docs.

## Using a real LLM

Set these in `.env` (never commit it):

| Provider | LLM_PROVIDER | LLM_BASE_URL | LLM_MODEL |
|---|---|---|---|
| OpenAI | openai_compatible | https://api.openai.com/v1 | gpt-4o-mini |
| Groq | openai_compatible | https://api.groq.com/openai/v1 | llama-3.3-70b-versatile |
| Local Ollama (no data leaves the machine) | openai_compatible | http://localhost:11434/v1 | llama3.1:8b |

Put the key in `LLM_API_KEY` (leave it empty for Ollama).

## Tests

```bash
cd backend && pytest -q
cd frontend && npm run lint && npm run build
```

CI runs both on every push and pull request.

## Deployment

- **Frontend on Netlify.** `netlify.toml` builds `frontend/`. In Netlify site settings set `VITE_API_URL` to the backend URL.
- **Backend and database** on any container host (Render, Railway, AWS ECS). Use `backend/Dockerfile`, a Postgres with pgvector, and set `DATABASE_URL`, `CORS_ORIGINS` (include the Netlify URL) and the `LLM_*` variables.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/jobs` | Multipart form: `output_types` (JSON list), `params` (JSON), `text` and/or `file`. Returns 202 with the job. |
| GET | `/api/jobs/{id}` | Job status and generated artefacts |
| GET | `/api/jobs` | Recent jobs |
| GET | `/api/artifacts/{id}/download?fmt=` | Download an artefact as `md`, `json`, `docx`, `pptx`, `srt` or `html` (depends on type) |
| GET | `/api/output-types` | Supported output types |
| GET | `/api/audit/verify` | Verify the audit hash chain |

## Roadmap

- Image input (OCR + vision captioning) and video/audio input (Whisper transcription)
- RAG over long sources with pgvector so outputs cite source passages
- PDF export and image rendering for infographics
- Login with role-based access and a human approval step before publishing
- Anchoring approved output hashes to a ledger
