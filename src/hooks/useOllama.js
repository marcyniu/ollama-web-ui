import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_OLLAMA_URL,
  deleteModel,
  getStoredOllamaUrl,
  listModels,
  pullModelStream,
  setStoredOllamaUrl,
  showModel,
} from '../services/ollamaApi';
import { clearModelDownload, setModelDownload, useModelStore } from '../store/modelStore';

function toUserErrorMessage(error) {
  if (error instanceof Error && error.message) {
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to reach Ollama. Check URL and CORS settings (OLLAMA_ORIGINS).';
    }
    return error.message;
  }

  return 'Unexpected error while connecting to Ollama.';
}

function mapStreamProgress(statusChunk = {}) {
  const rawStatus = String(statusChunk.status || '').toLowerCase();
  const status = rawStatus.includes('verifying') ? 'verifying' : 'downloading';
  const completed = Number(statusChunk.completed) || 0;
  const total = Number(statusChunk.total) || 0;
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return {
    status,
    completed,
    total,
    percentage,
    message: statusChunk.status || '',
  };
}

export function useOllama(options = {}) {
  const { initialBaseUrl, onModelsChanged } = options;
  const downloads = useModelStore((snapshot) => snapshot.downloads);

  const [baseUrl, setBaseUrlState] = useState(() => initialBaseUrl || getStoredOllamaUrl() || DEFAULT_OLLAMA_URL);
  const [models, setModels] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const setBaseUrl = useCallback((nextUrl) => {
    const normalized = setStoredOllamaUrl(nextUrl);
    setBaseUrlState(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    if (initialBaseUrl) {
      setBaseUrlState(initialBaseUrl);
    }
  }, [initialBaseUrl]);

  const refreshModels = useCallback(async (overrideBaseUrl) => {
    const targetBaseUrl = overrideBaseUrl || baseUrl;
    setIsLoadingModels(true);
    setConnectionError('');

    try {
      const tags = await listModels(targetBaseUrl);

      const enriched = await Promise.all(
        tags.map(async (model) => {
          try {
            const details = await showModel(model.name, targetBaseUrl);
            return {
              ...model,
              details: {
                parameter_size: details?.details?.parameter_size || model.details?.parameter_size || 'N/A',
                quantization_level: details?.details?.quantization_level || model.details?.quantization_level || 'N/A',
              },
            };
          } catch {
            return model;
          }
        }),
      );

      setModels(enriched);
      setIsConnected(true);
      if (onModelsChanged) {
        onModelsChanged(enriched);
      }
      return enriched;
    } catch (error) {
      setModels([]);
      setIsConnected(false);
      setConnectionError(toUserErrorMessage(error));
      throw error;
    } finally {
      setIsLoadingModels(false);
    }
  }, [baseUrl, onModelsChanged]);

  useEffect(() => {
    refreshModels().catch(() => {
      // Connection errors are surfaced in state for the UI.
    });
  }, [refreshModels]);

  const pullModel = useCallback(
    async (modelName) => {
      const name = (modelName || '').trim();
      if (!name) {
        throw new Error('Model name is required');
      }

      setModelDownload(name, {
        status: 'downloading',
        completed: 0,
        total: 0,
        percentage: 0,
        message: 'Starting pull',
      });

      try {
        await pullModelStream(name, {
          baseUrl,
          onProgress: (chunk) => {
            setModelDownload(name, mapStreamProgress(chunk));
          },
        });

        setModelDownload(name, {
          status: 'verifying',
          completed: 1,
          total: 1,
          percentage: 100,
          message: 'Completed',
        });

        await refreshModels();
        window.setTimeout(() => {
          clearModelDownload(name);
        }, 1500);
      } catch (error) {
        setModelDownload(name, {
          status: 'downloading',
          completed: 0,
          total: 0,
          percentage: 0,
          message: toUserErrorMessage(error),
        });
        throw error;
      }
    },
    [baseUrl, refreshModels],
  );

  const removeModel = useCallback(
    async (modelName) => {
      const name = (modelName || '').trim();
      if (!name) {
        throw new Error('Model name is required');
      }

      await deleteModel(name, baseUrl);
      clearModelDownload(name);
      await refreshModels();
    },
    [baseUrl, refreshModels],
  );

  const downloadingModels = useMemo(() => Object.keys(downloads), [downloads]);

  return {
    baseUrl,
    setBaseUrl,
    models,
    isConnected,
    isLoadingModels,
    connectionError,
    refreshModels,
    pullModel,
    removeModel,
    downloads,
    downloadingModels,
  };
}
