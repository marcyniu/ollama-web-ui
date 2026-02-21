import { useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw, Search } from 'lucide-react';
import { ModelCard } from '../components/ModelCard';
import { DEFAULT_OLLAMA_URL } from '../services/ollamaApi';
import { useOllama } from '../hooks/useOllama';

const CORS_COMMAND = 'OLLAMA_ORIGINS="*" ollama serve';

export default function ModelManager({ apiEndpoint, onApiEndpointChange, onModelsChanged }) {
  const {
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
  } = useOllama({
    initialBaseUrl: apiEndpoint || DEFAULT_OLLAMA_URL,
    onModelsChanged,
  });

  const [connectionInput, setConnectionInput] = useState(baseUrl || apiEndpoint || DEFAULT_OLLAMA_URL);
  const [searchTerm, setSearchTerm] = useState('');
  const [pullName, setPullName] = useState('');
  const [error, setError] = useState('');
  const [isPullingNew, setIsPullingNew] = useState(false);

  useEffect(() => {
    setConnectionInput(baseUrl);
  }, [baseUrl]);

  const filteredModels = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return models;
    return models.filter((model) => model.name.toLowerCase().includes(query));
  }, [models, searchTerm]);

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API might be blocked in some contexts.
    }
  };

  const handleSaveConnection = async () => {
    try {
      setError('');
      const normalized = setBaseUrl(connectionInput);
      if (onApiEndpointChange) {
        onApiEndpointChange(normalized);
      }
      await refreshModels(normalized);
    } catch (pullError) {
      setError(pullError instanceof Error ? pullError.message : 'Failed to update connection');
    }
  };

  const handlePullNewModel = async () => {
    const modelName = pullName.trim();
    if (!modelName) return;

    try {
      setError('');
      setIsPullingNew(true);
      await pullModel(modelName);
      setPullName('');
    } catch (pullError) {
      setError(pullError instanceof Error ? pullError.message : 'Failed to pull model');
    } finally {
      setIsPullingNew(false);
    }
  };

  const handleDelete = async (modelName) => {
    const confirmed = window.confirm(`Delete model ${modelName}?`);
    if (!confirmed) return;

    try {
      setError('');
      await removeModel(modelName);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete model');
    }
  };

  const handleRepull = async (modelName) => {
    try {
      setError('');
      await pullModel(modelName);
    } catch (pullError) {
      setError(pullError instanceof Error ? pullError.message : 'Failed to pull model');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-6xl mx-auto space-y-5">
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Connection Settings</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[280px]">
              <label htmlFor="ollama-url" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Ollama URL
              </label>
              <input
                id="ollama-url"
                type="text"
                value={connectionInput}
                onChange={(event) => setConnectionInput(event.target.value)}
                placeholder={DEFAULT_OLLAMA_URL}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={handleSaveConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save & Test
            </button>
            <button
              onClick={() => refreshModels().catch(() => {})}
              className="inline-flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-700 dark:text-gray-200">{isConnected ? 'Connected to Ollama' : 'Disconnected'}</span>
          </div>

          {!isConnected && (
            <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
              <p className="font-medium">CORS may be blocking requests.</p>
              <p className="mt-1">Run Ollama with an allowed origin and restart it.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-800/40">{CORS_COMMAND}</code>
                <button
                  onClick={() => handleCopy(CORS_COMMAND)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-200 dark:bg-amber-700/50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Command
                </button>
              </div>
              {connectionError && <p className="mt-2 text-xs">{connectionError}</p>}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Pull Model</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={pullName}
              onChange={(event) => setPullName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handlePullNewModel();
                }
              }}
              placeholder="Example: llama3"
              className="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handlePullNewModel}
              disabled={isPullingNew || !pullName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPullingNew ? 'Pulling...' : 'Pull'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Local Models</h2>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search installed models"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {isLoadingModels ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
              Loading models...
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
              No local models found.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.name}
                  model={model}
                  progress={downloads[model.name]}
                  isDownloading={Boolean(downloads[model.name])}
                  onDelete={handleDelete}
                  onPull={handleRepull}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
