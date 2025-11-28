# Copilot Instructions for Ollama Web UI

## Project Overview

Ollama Web UI is a modern, responsive single-page application (SPA) that provides a web-based chat interface for interacting with [Ollama](https://ollama.ai/) AI models. The application offers real-time streaming responses, dynamic model selection, and a clean user interface built with React and Tailwind CSS.

## Architecture

### Application Structure

```
ollama-web-ui/
├── .github/                    # GitHub workflows and agent configurations
│   ├── workflows/              # CI/CD automation pipelines
│   │   ├── a11y-performance.yml          # Accessibility & performance auditing
│   │   ├── code-review.yml               # Automated code review agent
│   │   ├── dependency-updater.yml        # Weekly dependency updates
│   │   ├── onboarding-lint.yml           # Documentation quality checks
│   │   ├── pr-title-normalizer.yml       # Semantic PR title enforcement
│   │   ├── pr-triage.yml                 # PR labeling and reviewer assignment
│   │   ├── release-notes.yml             # Changelog and release management
│   │   ├── security-audit.yml            # npm audit and vulnerability checks
│   │   └── test-lint.yml                 # Lint and build quality gate
│   ├── agents/                 # GitHub Custom Agent definitions
│   │   ├── docker-devops.agent.md        # DevOps & Docker expertise
│   │   ├── frontend-dev.agent.md         # Frontend development patterns
│   │   ├── markdown-content.agent.md     # Content rendering expertise
│   │   └── ui-ux.agent.md                # UI/UX best practices
│   └── pa11yci.json           # Accessibility testing configuration
├── public/                     # Static assets
├── scripts/                    # Automation scripts
│   └── agents/
│       ├── onboarding-lint.mjs           # README documentation linter
│       └── update-changelog.mjs          # Automated changelog generator
├── src/                        # Source code
│   ├── App.jsx                # Main application component
│   ├── main.jsx               # React application entry point
│   ├── index.css              # Global styles and Tailwind imports
│   └── assets/                # Images, icons, and media files
├── Dockerfile                  # Multi-stage production container
├── nginx.conf                  # Nginx configuration for production
├── vite.config.js             # Vite build configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS plugins (Tailwind, Autoprefixer)
├── eslint.config.js           # ESLint flat config
└── package.json               # Dependencies and scripts
```

### Architecture Patterns

#### Frontend Architecture

- **Component-based**: Single main component (`App.jsx`) with React hooks for state management
- **State Management**: React hooks (`useState`, `useEffect`, `useRef`) for local state
- **Side Effects**: `useEffect` for API calls, connection checks, and DOM updates
- **Refs**: Used for DOM manipulation (auto-scroll), abort controllers (streaming cancellation)

#### Data Flow

1. **User Input** → Component state → API request
2. **API Response** → State update → UI re-render
3. **Streaming** → Incremental state updates → Real-time UI updates

#### Communication Pattern

- **REST API**: Communication with Ollama server via HTTP
- **Streaming API**: Server-Sent Events using `fetch` with `ReadableStream`
- **Endpoints**:
  - `GET /api/tags` - Fetch available models
  - `POST /api/generate` - Generate AI responses (streaming or non-streaming)

#### Persistence

- **LocalStorage**: API endpoint, dark mode preference, streaming toggle
- **Session State**: Messages, current model, connection status

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI library for building interactive interfaces |
| **Vite** | 7.2.2 | Fast build tool and development server |
| **Tailwind CSS** | 4.1.17 | Utility-first CSS framework |
| **react-markdown** | 10.1.0 | Markdown rendering for AI responses |

### Build Tools & Linting

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.39.1 | Code linting and quality enforcement |
| **PostCSS** | 8.5.6 | CSS transformation pipeline |
| **Autoprefixer** | 10.4.22 | CSS vendor prefix automation |
| **@vitejs/plugin-react** | 5.1.0 | React Fast Refresh and JSX support |

### Development & Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **pa11y-ci** | 4.0.1 | Automated accessibility testing (WCAG2AA) |
| **Lighthouse CI** | (via GitHub Actions) | Performance and accessibility auditing |

### Production Deployment

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerized deployment |
| **Nginx (Alpine)** | Static file serving, compression, caching |
| **Multi-stage builds** | Optimized production images |

## Coding Standards & Best Practices

### JavaScript/React Standards

#### Code Style

- **ES Modules**: Use `import`/`export` syntax (project uses `"type": "module"`)
- **Arrow Functions**: Prefer arrow functions for consistency
- **Destructuring**: Use object/array destructuring where applicable
- **Template Literals**: Use backticks for string interpolation

#### React Patterns

1. **Functional Components**: Always use functional components (no class components)
2. **Hooks Best Practices**:
   - Place all hooks at the top level (never inside conditions/loops)
   - Use `useCallback` for callback functions passed as props
   - Use `useMemo` for expensive computations
   - Properly declare dependencies in `useEffect` dependency arrays
3. **State Management**:
   - Keep state as local as possible
   - Use `useState` for simple state
   - Use `useReducer` for complex state logic
   - Initialize state with functions when reading from localStorage
4. **Event Handlers**:
   - Prefix handler functions with `handle` (e.g., `handleSendMessage`)
   - Use inline arrow functions sparingly (prefer named handlers)

#### ESLint Rules (Enforced)

```javascript
{
  'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
  // React Hooks rules (via eslint-plugin-react-hooks)
  // React Refresh rules (via eslint-plugin-react-refresh)
}
```

### CSS & Styling

#### Tailwind CSS Guidelines

1. **Utility-First**: Use Tailwind utility classes directly in JSX
2. **Responsive Design**: Mobile-first breakpoints (`md:`, `lg:`)
3. **Dark Mode**: Use `dark:` variant for dark mode styling
4. **Spacing**: Follow Tailwind's spacing scale (4px increments)
5. **Colors**: Use Tailwind's color palette consistently
   - Primary: `blue-600`, `blue-700`, `blue-800`
   - Background: `gray-100` (light), `gray-900` (dark)
   - Text: Default or `gray-700`/`gray-300`

#### Dark Mode Implementation

```javascript
// Toggle dark mode by adding/removing 'dark' class on document root
document.documentElement.classList.add('dark');
document.documentElement.classList.remove('dark');
```

### API Integration Patterns

#### Fetch API Usage

```javascript
// Streaming example
const response = await fetch(`${apiEndpoint}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, prompt, stream: true }),
  signal: abortController.signal
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
// Process stream chunks...
```

#### Error Handling

- Use `try/catch` blocks for async operations
- Handle `AbortError` separately (user cancellation)
- Provide user-friendly error messages
- Log errors to console for debugging

#### Abort Controllers

- Store abort controller in ref: `abortControllerRef.current`
- Create new controller per request
- Call `.abort()` to cancel streaming requests
- Clean up in `finally` block

### Accessibility (a11y) Standards

1. **ARIA Labels**: Use `aria-label` for icon buttons and inputs
2. **Keyboard Navigation**: All interactive elements must be keyboard accessible
3. **Focus Management**: Visible focus indicators required
4. **Semantic HTML**: Use appropriate HTML5 semantic elements
5. **Color Contrast**: Meet WCAG 2.1 AA standards (tested via pa11y)
6. **Screen Reader Support**: Meaningful text for assistive technologies

### Performance Best Practices

1. **Code Splitting**: Leverage Vite's automatic code splitting
2. **Lazy Loading**: Load components/assets on demand when needed
3. **Memoization**: Use `useMemo`/`useCallback` to prevent unnecessary re-renders
4. **Virtual Scrolling**: Consider for long message lists (future enhancement)
5. **Asset Optimization**: 
   - Compress images
   - Use modern formats (WebP, AVIF)
   - Enable gzip/brotli compression (configured in nginx)

## Git & Version Control

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- Feature branches merged via Pull Requests

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `chore`: Build/tooling changes
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `ci`: CI/CD changes

**Examples:**
```
feat(chat): add streaming response support
fix(ui): resolve dark mode toggle issue
docs: update README with Docker instructions
chore(deps): upgrade React to v19
```

## Docker & Deployment

### Multi-Stage Build

1. **Builder Stage**: 
   - Base: `node:25`
   - Install dependencies
   - Build production bundle
2. **Production Stage**:
   - Base: `nginx:alpine`
   - Copy built assets
   - Serve via nginx on port 80

### Nginx Configuration

- Gzip compression enabled
- SPA routing support (`try_files`)
- Static asset caching (1 year for immutable assets)
- Served from `/usr/share/nginx/html`

### Container Best Practices

- `.dockerignore` excludes `node_modules`, `.git`, etc.
- Multi-stage builds minimize image size
- Alpine-based images for security and size
- Disable strict SSL during build (corporate proxies)

## Development Workflow

### Local Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run lint         # Run ESLint
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing & Quality

```bash
npm run agents:onboarding  # Lint README documentation
npm run agents:changelog   # Generate changelog entry
```

### Code Review Checklist

1. ✅ Run `npm run lint` (no errors)
2. ✅ Run `npm run build` (successful build)
3. ✅ Test in both light and dark modes
4. ✅ Verify responsive design (mobile, tablet, desktop)
5. ✅ Check accessibility (keyboard navigation, ARIA labels)
6. ✅ Add screenshots for UI changes
7. ✅ Update documentation if API changes

## GitHub Custom Agents

The project uses automated GitHub Actions workflows for CI/CD and quality assurance:

### Quality Gates

- **test-lint.yml**: ESLint + build verification on all PRs
- **a11y-performance.yml**: Lighthouse + pa11y accessibility audits
- **security-audit.yml**: Daily `npm audit` with vulnerability reporting

### Automation

- **dependency-updater.yml**: Weekly automated dependency updates
- **pr-triage.yml**: Auto-label PRs, assign reviewers, add checklists
- **code-review.yml**: Automated PR diff analysis and risk detection
- **release-notes.yml**: Automated changelog generation and GitHub releases

### Documentation Enforcement

- **onboarding-lint.yml**: Validates README completeness
- **pr-title-normalizer.yml**: Enforces semantic PR titles

## Common Patterns & Snippets

### State with LocalStorage

```javascript
const [value, setValue] = useState(() => {
  const saved = localStorage.getItem('key');
  return saved !== null ? JSON.parse(saved) : defaultValue;
});

useEffect(() => {
  localStorage.setItem('key', JSON.stringify(value));
}, [value]);
```

### Auto-scroll to Bottom

```javascript
const messagesEndRef = useRef(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

// In JSX: <div ref={messagesEndRef} />
```

### Toggle Switch Component

```javascript
<button
  onClick={handleToggle}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    enabled ? 'bg-blue-600' : 'bg-gray-200'
  }`}
>
  <span
    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
      enabled ? 'translate-x-6' : 'translate-x-1'
    }`}
  />
</button>
```

## Environment Configuration

### Development

- Vite dev server: `http://localhost:5173`
- Default Ollama endpoint: `http://localhost:11434`

### Production

- Served via Nginx on port 80
- Static assets cached with immutable headers
- Gzip compression enabled

## API Reference

### Ollama API Integration

#### List Models

```
GET /api/tags
Response: { models: [{ name: string, ... }] }
```

#### Generate Response

```
POST /api/generate
Body: {
  model: string,
  prompt: string,
  stream: boolean
}
Response (streaming): Server-Sent Events with JSON objects
Response (non-streaming): { response: string }
```

## Future Enhancements

Consider these patterns when extending the application:

1. **Conversation History**: Persist chat sessions to localStorage/IndexedDB
2. **Multi-turn Context**: Send conversation history to maintain context
3. **Model Parameters**: Expose temperature, top_p, etc. in UI
4. **File Uploads**: Support image inputs for vision models
5. **Code Highlighting**: Enhance markdown rendering with syntax highlighting
6. **Export Conversations**: Download chat history as markdown/JSON
7. **User Preferences**: Expand settings (font size, theme customization)

## Debugging Tips

1. **Connection Issues**: Check Ollama server is running and endpoint is correct
2. **Streaming Failures**: Verify CORS settings on Ollama server
3. **Dark Mode**: Ensure `dark` class is properly toggled on `<html>` element
4. **Build Errors**: Clear `node_modules` and `dist`, run `npm install`
5. **ESLint Errors**: Check dependency arrays in `useEffect` hooks

## License

This project is licensed under the MIT License. See `LICENSE` file for details.

---

**Last Updated**: November 27, 2025  
**Maintainer**: Marcin Wojcik (@marcyniu)  
**Repository**: ollama-web-ui
