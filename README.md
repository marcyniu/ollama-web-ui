# Ollama Web UI

A responsive React/Tailwind SPA front-end for Ollama with direct browser-to-local-Ollama integration.

## Features

- **Real-time Streaming**: Token-by-token chat responses using Ollama's `/api/generate` endpoint with `stream: true`
- **Model Lifecycle Management**: Pull, delete, inspect, and search models directly in the browser
- **Real-time Pull Progress**: Streamed pull status with live progress bars from `/api/pull`
- **Configuration**: Connection settings with persistent Ollama URL (default: `http://127.0.0.1:11434`)
- **Markdown Display**: Full markdown rendering of AI responses
- **Responsive Design**: Built with Tailwind CSS for a modern, responsive interface
- **Docker Deployment**: Multi-stage Docker container exposing port 80

## Prerequisites

- Node.js 20+ (for development)
- Docker (for containerized deployment)
- Running Ollama server instance

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

4. Open **Model Manager** and verify the Ollama URL (default: `http://127.0.0.1:11434`)

5. If the app shows CORS connection issues, start Ollama with:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

## Building for Production

Build the static files:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Docker Deployment

Create network (if it does not exist)
```bash
docker network create --driver bridge \
        --ip-range 172.18.0.0/16 \
        --subnet 172.18.0.0/16 dev-net
```

Add local domain to /etc/hosts (requires sudo).
Run this with a root shell or use tee to append as root:
```bash
echo "172.18.0.46 {your_local_domain}" | sudo tee -a /etc/hosts
```

Build the Docker image:
```bash
docker build -t ollama-web-ui .
```

Run the container:
```bash
docker run --rm -it \
  --net dev-net \
  --ip 172.18.0.46 \
  --add-host docker-host:172.18.0.1 \
  --name ollama-web-ui-dev \
  ollama-web-ui
```

## Usage

1. Open **Model Manager** from the left menu
2. Set/test the Ollama URL in **Connection Settings**
3. Pull a model by name (for example `llama3`) and monitor real-time progress
4. Review installed models with size and quantization metadata
5. Delete or copy model names from model cards
6. Return to chat, select a model, and stream responses

## Configuration

The Ollama API endpoint is stored in browser localStorage and persists across sessions.

For direct browser access, Ollama must allow your web origin. If needed:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

## Tech Stack

- React 19
- Vite
- Tailwind CSS v4
- react-markdown
- Nginx (for Docker deployment)

## GitHub Custom Agents

Automation lives in `.github/workflows/` and keeps pull requests healthy:

| Agent | Purpose |
| --- | --- |
| PR Triage (`pr-triage.yml`) | Labels PRs based on touched files, assigns default reviewers, and posts a readiness checklist. |
| Automated Code Review (`code-review.yml`) | Summarizes diffs, surfaces large/risky changes, and nudges for screenshots/tests. |
| Dependency & Security Auditor (`security-audit.yml`) | Runs `npm audit`, uploads reports, and blocks merges on high severity vulns. |
| Dependency Updater (`dependency-updater.yml`) | Weekly `npm-check-updates` run that opens a PR after lint/build succeed. |
| Test & Lint Gate (`test-lint.yml`) | Executes `npm run lint` and `npm run build` on pushes/PRs for a fast regression signal. |
| Accessibility & Performance Auditor (`a11y-performance.yml`) | Builds the app, runs Lighthouse + pa11y, and comments core metrics plus top violations. |
| Release Notes & Changelog (`release-notes.yml`) | Generates `CHANGELOG.md` entries and publishes GitHub releases from tags or manual triggers. |
| Onboarding Linter (`onboarding-lint.yml`) | Checks `README.md` for required sections/snippets and uploads guidance for contributors. |
| PR Title & Changelog Normalizer (`pr-title-normalizer.yml`) | Enforces semantic PR titles and suggests changelog bullets. |

### Local agent helpers

Two utility scripts mirror the CI behavior:

- `npm run agents:onboarding` &rarr; runs the onboarding linter locally.
- `npm run agents:changelog` &rarr; inserts a new section into `CHANGELOG.md` using the most recent commits (set `RELEASE_VERSION` to override the version tag).

### How to run GitHub Actions locally:
```
$ cd ~/code/node/ollama-web-ui
$ act -W .github/workflows/test-lint.yml -j quality
```

## License

MIT
