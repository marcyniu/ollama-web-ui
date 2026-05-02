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
    body: JSON.stringify({ model: name }),
  });

  return ensureJsonResponse(response);
}

function normalizeLibraryEntry(entry = {}) {
  const name = (entry.name || entry.model || '').trim();
  const description = (entry.description || entry.summary || '').trim();
  const url = entry.url || (name ? `https://ollama.com/library/${name}` : '');
  if (!name) return null;
  return { name, description, url, source: 'remote' };
}

function collectCandidateArray(value) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value;

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    for (const next of Object.values(current)) {
      if (Array.isArray(next) && next.length > 0 && next.some((item) => item && typeof item === 'object')) {
        return next;
      }
      if (next && typeof next === 'object') {
        queue.push(next);
      }
    }
  }

  return [];
}

function parseLibraryHtml(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const script = doc.querySelector('#__NEXT_DATA__');
  if (!script?.textContent) return [];

  try {
    const payload = JSON.parse(script.textContent);
    const candidateArray = collectCandidateArray(payload);
    const mapped = candidateArray.map(normalizeLibraryEntry).filter(Boolean);
    return mapped;
  } catch {
    return [];
  }
}

const FALLBACK_LIBRARY = [
  { name: 'llama3', description: 'Meta Llama 3 family for general chat and coding.', url: 'https://ollama.com/library/llama3', source: 'fallback' },
  { name: 'llama3.2', description: 'Updated Llama family with strong instruction following.', url: 'https://ollama.com/library/llama3.2', source: 'fallback' },
  { name: 'qwen2.5', description: 'Alibaba Qwen 2.5 models with broad multilingual support.', url: 'https://ollama.com/library/qwen2.5', source: 'fallback' },
  { name: 'mistral', description: 'Fast open-weight model line from Mistral AI.', url: 'https://ollama.com/library/mistral', source: 'fallback' },
  { name: 'gemma3', description: 'Google Gemma family models for local inference.', url: 'https://ollama.com/library/gemma3', source: 'fallback' },
  { name: 'phi4', description: 'Microsoft Phi family focused on compact performance.', url: 'https://ollama.com/library/phi4', source: 'fallback' },
  { name: 'deepseek-r1', description: 'Reasoning-focused model family from DeepSeek.', url: 'https://ollama.com/library/deepseek-r1', source: 'fallback' },
  { name: 'codellama', description: 'Code-specialized Llama variant for development tasks.', url: 'https://ollama.com/library/codellama', source: 'fallback' },
];

export async function listLibraryModels() {
  try {
    const apiResponse = await fetch('https://ollama.com/api/tags');
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      const apiModels = (Array.isArray(apiData?.models) ? apiData.models : [])
        .map(normalizeLibraryEntry)
        .filter(Boolean);
      if (apiModels.length > 0) return apiModels;
    }
  } catch {
    // ignore and try next source
  }

  try {
    const htmlResponse = await fetch('https://ollama.com/library');
    if (htmlResponse.ok) {
      const htmlText = await htmlResponse.text();
      const htmlModels = parseLibraryHtml(htmlText);
      if (htmlModels.length > 0) return htmlModels;
    }
  } catch {
    // ignore and use fallback below
  }

  return FALLBACK_LIBRARY;
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
