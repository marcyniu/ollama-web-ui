# Ollama Web UI

A responsive React/Tailwind SPA front-end for Ollama server with real-time streaming chat capabilities.

## Features

- **Real-time Streaming**: Token-by-token chat responses using Ollama's `/api/generate` endpoint with `stream: true`
- **Model Management**: Dynamic model selection using the `/api/tags` endpoint
- **Configuration**: Persistent input for Ollama API endpoint with connection health check
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

4. Configure the Ollama API endpoint in the Settings panel (default: `http://localhost:11434`)

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

Build the Docker image:
```bash
docker build -t ollama-web-ui .
```

Run the container:
```bash
docker run -d -p 80:80 ollama-web-ui
```

Access the application at `http://localhost`

## Usage

1. Click **Settings** to configure your Ollama server endpoint
2. Select a model from the dropdown (models are fetched from `/api/tags`)
3. Start chatting! Messages are streamed in real-time
4. Use **Clear Chat** to start a new conversation
5. Press **Stop Generation** to halt an in-progress response

## Configuration

The Ollama API endpoint is stored in browser's localStorage and persists across sessions. Update it in the Settings panel to point to your Ollama server.

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

## License

MIT
