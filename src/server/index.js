import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.MODEL_MANAGER_PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ENABLE_MODEL_MANAGER = process.env.ENABLE_MODEL_MANAGER === 'true';

// In-memory operation store
const operations = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', enabled: ENABLE_MODEL_MANAGER });
});

// Get installed models
app.get('/api/models/installed', async (req, res) => {
  if (!ENABLE_MODEL_MANAGER) {
    return res.status(403).json({ error: 'Model manager is disabled' });
  }

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = (data.models || []).map(model => ({
      name: model.name,
      version: model.digest?.slice(0, 12) || 'unknown',
      size: model.size || 0,
      installedAt: model.modified_at || new Date().toISOString(),
      family: model.details?.family || 'unknown',
      parameterSize: model.details?.parameter_size || 'unknown'
    }));
    
    res.json(models);
  } catch (error) {
    console.error('Error fetching installed models:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get remote catalog (using Ollama library endpoint)
app.get('/api/models/remote', async (req, res) => {
  if (!ENABLE_MODEL_MANAGER) {
    return res.status(403).json({ error: 'Model manager is disabled' });
  }

  try {
    // Return a curated list of popular models
    // In a real implementation, this could fetch from ollama.ai/library API
    const catalog = [
      { name: 'llama3.2:latest', description: 'Meta Llama 3.2 - Latest version', size: '2.0 GB', recommended: true },
      { name: 'llama3.2:1b', description: 'Meta Llama 3.2 1B - Lightweight', size: '1.3 GB', recommended: true },
      { name: 'llama3.2:3b', description: 'Meta Llama 3.2 3B - Balanced', size: '2.0 GB', recommended: true },
      { name: 'qwen2.5:latest', description: 'Qwen 2.5 - Alibaba\'s latest model', size: '4.7 GB', recommended: true },
      { name: 'mistral:latest', description: 'Mistral 7B - Efficient and powerful', size: '4.1 GB', recommended: true },
      { name: 'phi3:latest', description: 'Microsoft Phi-3 - Compact and capable', size: '2.3 GB', recommended: true },
      { name: 'gemma2:2b', description: 'Google Gemma 2 2B - Fast and efficient', size: '1.6 GB', recommended: false },
      { name: 'gemma2:9b', description: 'Google Gemma 2 9B - High performance', size: '5.4 GB', recommended: false },
      { name: 'llava:latest', description: 'LLaVA - Vision-language model', size: '4.7 GB', recommended: false },
      { name: 'codellama:latest', description: 'Code Llama - Code generation', size: '3.8 GB', recommended: false },
      { name: 'deepseek-coder:latest', description: 'DeepSeek Coder - Advanced coding', size: '3.7 GB', recommended: false },
      { name: 'neural-chat:latest', description: 'Neural Chat - Conversational AI', size: '4.1 GB', recommended: false }
    ];
    
    res.json(catalog);
  } catch (error) {
    console.error('Error fetching remote catalog:', error);
    res.status(500).json({ error: error.message });
  }
});

// Install a model
app.post('/api/models/install', (req, res) => {
  if (!ENABLE_MODEL_MANAGER) {
    return res.status(403).json({ error: 'Model manager is disabled' });
  }

  const { name, version } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Model name is required' });
  }

  // Validate model name to prevent command injection
  if (!/^[a-zA-Z0-9._:-]+$/.test(name)) {
    return res.status(400).json({ error: 'Invalid model name format' });
  }

  const opId = randomUUID();
  const modelName = version ? `${name}:${version}` : name;

  const operation = {
    opId,
    type: 'install',
    modelName,
    progress: 0,
    logs: [],
    status: 'running',
    startedAt: new Date().toISOString()
  };

  operations.set(opId, operation);

  // Spawn ollama pull command
  const child = spawn('ollama', ['pull', modelName]);

  child.stdout.on('data', (data) => {
    const line = data.toString();
    operation.logs.push({ timestamp: new Date().toISOString(), message: line });
    
    // Try to parse progress from ollama output
    const progressMatch = line.match(/(\d+)%/);
    if (progressMatch) {
      operation.progress = parseInt(progressMatch[1], 10);
    }
  });

  child.stderr.on('data', (data) => {
    const line = data.toString();
    operation.logs.push({ timestamp: new Date().toISOString(), message: line, level: 'error' });
  });

  child.on('close', (code) => {
    if (code === 0) {
      operation.status = 'completed';
      operation.progress = 100;
      operation.logs.push({ 
        timestamp: new Date().toISOString(), 
        message: `Successfully installed ${modelName}`, 
        level: 'success' 
      });
    } else {
      operation.status = 'failed';
      operation.logs.push({ 
        timestamp: new Date().toISOString(), 
        message: `Failed to install ${modelName} (exit code: ${code})`, 
        level: 'error' 
      });
    }
    operation.completedAt = new Date().toISOString();
  });

  res.json({ opId });
});

// Delete a model
app.post('/api/models/delete', (req, res) => {
  if (!ENABLE_MODEL_MANAGER) {
    return res.status(403).json({ error: 'Model manager is disabled' });
  }

  const { name, version } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Model name is required' });
  }

  // Validate model name to prevent command injection
  if (!/^[a-zA-Z0-9._:-]+$/.test(name)) {
    return res.status(400).json({ error: 'Invalid model name format' });
  }

  const opId = randomUUID();
  const modelName = version ? `${name}:${version}` : name;

  const operation = {
    opId,
    type: 'delete',
    modelName,
    progress: 0,
    logs: [],
    status: 'running',
    startedAt: new Date().toISOString()
  };

  operations.set(opId, operation);

  // Spawn ollama rm command
  const args = ['rm', modelName];
  const child = spawn('ollama', args);

  child.stdout.on('data', (data) => {
    const line = data.toString();
    operation.logs.push({ timestamp: new Date().toISOString(), message: line });
  });

  child.stderr.on('data', (data) => {
    const line = data.toString();
    operation.logs.push({ timestamp: new Date().toISOString(), message: line, level: 'error' });
  });

  child.on('close', (code) => {
    if (code === 0) {
      operation.status = 'completed';
      operation.progress = 100;
      operation.logs.push({ 
        timestamp: new Date().toISOString(), 
        message: `Successfully deleted ${modelName}`, 
        level: 'success' 
      });
    } else {
      operation.status = 'failed';
      operation.logs.push({ 
        timestamp: new Date().toISOString(), 
        message: `Failed to delete ${modelName} (exit code: ${code})`, 
        level: 'error' 
      });
    }
    operation.completedAt = new Date().toISOString();
  });

  res.json({ opId });
});

// Get operation status
app.get('/api/models/status', (req, res) => {
  if (!ENABLE_MODEL_MANAGER) {
    return res.status(403).json({ error: 'Model manager is disabled' });
  }

  const { opId } = req.query;
  
  if (!opId) {
    return res.status(400).json({ error: 'Operation ID is required' });
  }

  const operation = operations.get(opId);
  
  if (!operation) {
    return res.status(404).json({ error: 'Operation not found' });
  }

  res.json(operation);
});

// Cleanup old operations (run periodically)
setInterval(() => {
  const now = Date.now();
  for (const [opId, operation] of operations.entries()) {
    if (operation.status !== 'running') {
      const completedTime = new Date(operation.completedAt).getTime();
      // Remove operations older than 1 hour
      if (now - completedTime > 60 * 60 * 1000) {
        operations.delete(opId);
      }
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Start server only if enabled
if (ENABLE_MODEL_MANAGER) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Model Manager API server running on http://127.0.0.1:${PORT}`);
    console.log(`Connected to Ollama at ${OLLAMA_HOST}`);
  });
} else {
  console.log('Model Manager is disabled. Set ENABLE_MODEL_MANAGER=true to enable.');
}

export default app;
