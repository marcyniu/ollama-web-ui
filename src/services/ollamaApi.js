const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const OLLAMA_URL_STORAGE_KEY = 'ollamaApiEndpoint';

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_OLLAMA_URL).trim().replace(/\/$/, '');
}

function buildUrl(path, baseUrl) {
  return `${normalizeBaseUrl(baseUrl)}${path}`;
}

async function ensureJsonResponse(response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json();
}

function parseNdjsonChunk(buffer, chunkText, onMessage) {
  const nextBuffer = `${buffer}${chunkText}`;
  const lines = nextBuffer.split('\n');
  const remainder = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      onMessage(JSON.parse(trimmed));
    } catch {
      // Skip malformed chunks from partial transport boundaries.
    }
  }

  return remainder;
}

export function getStoredOllamaUrl() {
  const saved = localStorage.getItem(OLLAMA_URL_STORAGE_KEY);
  return normalizeBaseUrl(saved || DEFAULT_OLLAMA_URL);
}

export function setStoredOllamaUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  localStorage.setItem(OLLAMA_URL_STORAGE_KEY, normalized);
  return normalized;
}

export async function listModels(baseUrl) {
  const response = await fetch(buildUrl('/api/tags', baseUrl));
  const data = await ensureJsonResponse(response);
  const models = Array.isArray(data.models) ? data.models : [];

  return [...models].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function showModel(name, baseUrl) {
  const response = await fetch(buildUrl('/api/show', baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: name }),
  });

  return ensureJsonResponse(response);
}

export async function deleteModel(name, baseUrl) {
  const response = await fetch(buildUrl('/api/delete', baseUrl), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  return ensureJsonResponse(response);
}

export async function pullModelStream(name, options = {}) {
  const { baseUrl, signal, onProgress } = options;

  const response = await fetch(buildUrl('/api/pull', baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: name, stream: true }),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Pull failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Streaming not supported by this browser');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer = parseNdjsonChunk(buffer, decoder.decode(value, { stream: true }), (chunk) => {
      if (onProgress) {
        onProgress(chunk);
      }
    });
  }

  const tail = buffer.trim();
  if (tail && onProgress) {
    try {
      onProgress(JSON.parse(tail));
    } catch {
      // Ignore trailing parse errors.
    }
  }
}

export { DEFAULT_OLLAMA_URL };
