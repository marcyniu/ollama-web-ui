import { useState, useEffect, useRef } from 'react';
import { Trash2, Download, X, RefreshCw } from 'lucide-react';

export function ModelManager({ apiEndpoint, onModelsChanged }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(null);
  const [pullError, setPullError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingModel, setDeletingModel] = useState('');
  const abortRef = useRef(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const sorted = (data.models || []).sort((a, b) => a.name.localeCompare(b.name));
        setModels(sorted);
      }
    } catch {
      // silently fail; connection status is shown in the header
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiEndpoint) {
      fetchModels();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint]);

  const handleDelete = async (modelName) => {
    if (!confirm(`Are you sure you want to delete "${modelName}"?`)) return;
    setDeleteError('');
    setDeletingModel(modelName);
    try {
      const response = await fetch(`${apiEndpoint}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      if (!response.ok) {
        const text = await response.text();
        setDeleteError(`Failed to delete: ${text || response.statusText}`);
      } else {
        await fetchModels();
        if (onModelsChanged) onModelsChanged();
      }
    } catch (err) {
      setDeleteError(`Error: ${err.message}`);
    } finally {
      setDeletingModel('');
    }
  };

  const handlePull = async () => {
    if (!pullModelName.trim()) return;
    setIsPulling(true);
    setPullError('');
    setPullProgress({ status: 'Starting…', percent: 0 });

    abortRef.current = new AbortController();
    try {
      const response = await fetch(`${apiEndpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pullModelName.trim(), stream: true }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        setPullError(`Failed to pull: ${text || response.statusText}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.error) {
              setPullError(json.error);
              return;
            }
            const percent =
              json.total && json.completed
                ? Math.round((json.completed / json.total) * 100)
                : null;
            setPullProgress({ status: json.status || '', percent });
          } catch {
            // ignore malformed lines
          }
        }
      }

      setPullProgress({ status: 'Done', percent: 100 });
      setPullModelName('');
      await fetchModels();
      if (onModelsChanged) onModelsChanged();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setPullError(`Error: ${err.message}`);
      }
    } finally {
      setIsPulling(false);
      abortRef.current = null;
    }
  };

  const handleCancelPull = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-4">
      {/* Pull a model */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4" />
          Pull New Model
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={pullModelName}
            onChange={(e) => setPullModelName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isPulling && handlePull()}
            placeholder="e.g. llama3.2:3b"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPulling}
          />
          {isPulling ? (
            <button
              onClick={handleCancelPull}
              className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          ) : (
            <button
              onClick={handlePull}
              disabled={!pullModelName.trim()}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Pull
            </button>
          )}
        </div>

        {/* Pull progress */}
        {pullProgress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>{pullProgress.status}</span>
              {pullProgress.percent !== null && (
                <span>{pullProgress.percent}%</span>
              )}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              {pullProgress.percent !== null ? (
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${pullProgress.percent}%` }}
                />
              ) : (
                <div className="h-2 bg-blue-500 rounded-full animate-pulse w-full" />
              )}
            </div>
          </div>
        )}

        {pullError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{pullError}</p>
        )}
      </div>

      {/* Installed models */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm dark:text-white">
            Installed Models ({models.length})
          </h4>
          <button
            onClick={fetchModels}
            disabled={loading}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Refresh models"
            aria-label="Refresh models list"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {deleteError && (
          <p className="mb-2 text-xs text-red-600 dark:text-red-400">{deleteError}</p>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {models.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {loading ? 'Loading…' : 'No models installed'}
            </p>
          ) : (
            models.map((model) => (
              <div
                key={model.name}
                className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium dark:text-white truncate">{model.name}</p>
                  {model.size && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatSize(model.size)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(model.name)}
                  disabled={deletingModel === model.name}
                  className="ml-2 p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition disabled:opacity-50 flex-shrink-0"
                  title={`Delete ${model.name}`}
                  aria-label={`Delete model ${model.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
