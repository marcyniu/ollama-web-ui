# Ollama Web UI

A responsive React/Tailwind SPA front-end for Ollama server with real-time streaming chat capabilities.

## Features

- **Real-time Streaming**: Token-by-token chat responses using Ollama's `/api/generate` endpoint with `stream: true`
- **Model Lifecycle Management**: Install, delete, and manage Ollama models directly from the web UI
- **Model Selection**: Dynamic model selection using the `/api/tags` endpoint
- **Multi-Endpoint Support**: Configure and switch between multiple Ollama server endpoints
- **Chat History**: Persistent conversation history with search and reload capabilities
- **Model Parameters**: Adjustable model parameters (temperature, top_p, max_tokens) with presets
- **Vision Model Support**: Image upload and analysis with vision-capable models (LLaVA, Moondream)
- **Configuration**: Persistent settings with connection health check
- **Markdown Display**: Full markdown rendering of AI responses with thinking section support
- **Responsive Design**: Built with Tailwind CSS for a modern, responsive interface
- **Dark Mode**: System and manual dark mode toggle
- **Docker Deployment**: Multi-stage Docker container exposing port 80

## Prerequisites

- Node.js 20+ (for development)
- Docker (for containerized deployment)
- Running Ollama server instance

## Development

### Frontend Development

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

### Backend Development (Model Manager)

The Model Manager backend provides API endpoints for installing and deleting models. It's optional and must be explicitly enabled.

1. Start the backend server (in a separate terminal):
```bash
npm run dev:server
```

This starts an Express server on `http://localhost:3001` with the following environment variables:
- `ENABLE_MODEL_MANAGER=true` - Enables the Model Manager API
- `MODEL_MANAGER_PORT=3001` - Port for the backend server (default: 3001)
- `OLLAMA_HOST=http://localhost:11434` - Ollama server endpoint

2. The frontend will automatically connect to the backend at `http://localhost:3001`

3. To run both frontend and backend together:
```bash
npm run dev:all
```

**Security Note**: The Model Manager backend should only be exposed locally or within a trusted network. It executes `ollama` CLI commands and should not be exposed to the public internet.

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

### Standard Deployment (Static Frontend Only)

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

### Deployment with Model Manager Backend

To enable the Model Manager backend in production, use the alternative Dockerfile:

Build the Docker image with backend support:
```bash
docker build -f Dockerfile.with-backend -t ollama-web-ui:with-backend .
```

Run with Model Manager enabled:
```bash
docker run -d \
  --net dev-net \
  --restart=always \
  --name ollama-web \
  -e ENABLE_MODEL_MANAGER=true \
  -e OLLAMA_HOST=http://ollama:11434 \
  -p 80:80 \
  -p 3001:3001 \
  ollama-web-ui:with-backend
```

**Important**: When running with Model Manager enabled:
- The container needs access to the `ollama` CLI
- You may need to mount the Ollama socket or ensure the container can execute `ollama` commands
- Consider running on a host network or ensuring proper network configuration
- Only expose port 3001 within trusted networks

## Set up environment for permanent run with Nginx reverse proxy:

Run the container permanently in the background:
```bash
docker run -d \
  --net dev-net \
  --restart=always \
  --name ollama-web \
  ollama-web-ui
```

Example configuration for Nginx reverse proxy (`/etc/nginx/conf.d/ollama-web.conf`):
```nginx
# Server Block for {application_subdomain_1}
server {
    listen 80;
    server_name {application_subdomain_1};

    location / {
        # Use the Docker container name as the upstream target
        proxy_pass http://ollama-web:80; # Assuming app1 runs on port 80
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # ... other proxy headers
    }
}

# Server Block for {application_subdomain_2}
server {
    listen 80;
    server_name {application_subdomain_2};

    location / {
        # Use the Docker container name as the upstream target
        proxy_pass http://test-web:80; # Assuming app2 runs on port 80
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # ... other proxy headers
    }
}
```

Run the container permanently in the background:
```bash
docker run -d \
  --name nginx-proxy \
  --net dev-net \
  --restart=always \
  -p 80:80 \
  -p 443:443 \
  -v /etc/nginx/conf.d:/etc/nginx/conf.d:ro \
  nginx
```

## Usage

### Chat Interface

1. Click **Settings** to configure your Ollama server endpoint
2. Select a model from the dropdown (models are fetched from `/api/tags`)
3. Start chatting! Messages are streamed in real-time
4. Use **Clear Chat** to start a new conversation
5. Press **Stop Generation** to halt an in-progress response
6. Upload images for vision-capable models
7. Adjust model parameters (temperature, top_p, etc.) in the settings

### Model Manager

Access the Model Manager from the Settings panel to:

1. **View Installed Models**: See all locally installed Ollama models with metadata (size, version, family, parameters)
2. **Browse Available Models**: View a curated catalog of popular models ready to install
3. **Install Models**: One-click installation with real-time progress tracking and logs
4. **Delete Models**: Remove unwanted models with confirmation
5. **Monitor Operations**: Watch installation/deletion progress with percentage and streaming logs

**Note**: The Model Manager requires the backend server to be running with `ENABLE_MODEL_MANAGER=true`.

### Chat History

1. Click **History** to view all past conversations
2. Click on any chat to reload it and continue the conversation
3. Delete unwanted conversations with the trash icon
4. Conversations are automatically saved and pruned after 30 days

## Configuration

The Ollama API endpoint is stored in browser's localStorage and persists across sessions. Update it in the Settings panel to point to your Ollama server.

## Tech Stack

### Frontend
- React 19
- Vite 7
- Tailwind CSS v4
- react-markdown
- lucide-react (icons)

### Backend (Optional - Model Manager)
- Express 5
- Node.js 25+
- CORS middleware

### Deployment
- Nginx (for Docker deployment)
- Multi-stage Docker builds

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
