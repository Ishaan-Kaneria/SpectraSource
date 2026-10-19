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

Prerequisites: Python 3.10+ and Node 22+. No database server needed: the backend uses a local SQLite file unless `DATABASE_URL` says otherwise.

**Backend** (terminal 1)

```bash
cd backend
cp ../.env.example .env       # then set LLM_PROVIDER=gemini and LLM_API_KEY (see below)
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload # http://localhost:8000/health
```

**Or with Docker** (backend + Postgres): put `.env` at the repo root and run `docker compose up --build`.

**Frontend**

```bash
cd frontend
npm install                   # talks to http://localhost:8000 unless VITE_API_URL is set
npm run dev                   # http://localhost:5173
```

API docs are at http://localhost:8000/docs.

## Using a real LLM

The demo uses **Google Gemini**: one free key covers text, images and video. Get a key at https://aistudio.google.com/apikey, then set in `.env` (never commit it):

```bash
LLM_PROVIDER=gemini
LLM_API_KEY=your-key-here
```

That's all. The model defaults to `gemini-flash-latest`; pin another with `LLM_MODEL`. Images are read by the vision model, and video/audio (up to 20 MB) is sent to Gemini directly, which transcribes speech and notes on-screen text.

Other providers work through the OpenAI-compatible connector:

| Provider | LLM_PROVIDER | LLM_BASE_URL | LLM_MODEL |
|---|---|---|---|
| OpenAI | openai_compatible | (default) | (default gpt-4o-mini) |
| Groq | openai_compatible | https://api.groq.com/openai/v1 | llama-3.3-70b-versatile |
| Local Ollama (no data leaves the machine) | openai_compatible | http://localhost:11434/v1 | llama3.1:8b |

With these, video and audio go to a Whisper-style endpoint (`TRANSCRIBE_*`; OpenAI `whisper-1` or Groq `whisper-large-v3`).

## Tests

```bash
cd backend && pytest -q
cd frontend && npm run lint && npm run build
```

CI runs both on every push and pull request.

## Deployment

- **Backend on Render (free):** Render dashboard > **New > Blueprint** > select this repo. `render.yaml` builds `backend/Dockerfile` and asks for `LLM_API_KEY`. The free plan sleeps when idle (the first request then takes about a minute) and its disk resets on redeploy.
- **Frontend on Netlify:** `netlify.toml` builds `frontend/` and points `VITE_API_URL` at `https://spectrasource-api.onrender.com`. If Render assigns a different URL, update that line.
- CORS allows the Netlify site and its deploy previews (`CORS_ORIGINS`, `CORS_ORIGIN_REGEX`).

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

- Keyframe captions for silent video; local Whisper for fully offline transcription
- RAG over long sources with pgvector so outputs cite source passages
- PDF export and image rendering for infographics
- Login with role-based access and a human approval step before publishing
- Anchoring approved output hashes to a ledger
