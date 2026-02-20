import { Download, Trash2, CheckCircle, Clock } from 'lucide-react';

/**
 * ModelCard component to display a model with actions
 */
export function ModelCard({ model, isInstalled, onInstall, onDelete, isOperating }) {
  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (typeof bytes === 'string') return bytes; // Already formatted
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {model.name}
          </h3>
          {model.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {model.description}
            </p>
          )}
        </div>
        {isInstalled && (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
        )}
        {model.recommended && !isInstalled && (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex-shrink-0 ml-2">
            Recommended
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Size:</span>
          <span className="ml-1 text-gray-700 dark:text-gray-300">
            {formatSize(model.size)}
          </span>
        </div>
        {isInstalled && model.installedAt && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Installed:</span>
            <span className="ml-1 text-gray-700 dark:text-gray-300">
              {formatDate(model.installedAt)}
            </span>
          </div>
        )}
        {model.family && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Family:</span>
            <span className="ml-1 text-gray-700 dark:text-gray-300">
              {model.family}
            </span>
          </div>
        )}
        {model.parameterSize && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Parameters:</span>
            <span className="ml-1 text-gray-700 dark:text-gray-300">
              {model.parameterSize}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isInstalled ? (
          <button
            onClick={() => onInstall(model)}
            disabled={isOperating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            aria-label={`Install ${model.name}`}
          >
            {isOperating ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Install
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => onDelete(model)}
            disabled={isOperating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            aria-label={`Delete ${model.name}`}
          >
            {isOperating ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
