import { Copy, Download, Trash2 } from 'lucide-react';

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** index;
  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function describeQuantization(level) {
  const raw = String(level || '').trim();
  if (!raw || raw === 'N/A') return 'Not available';

  const normalized = raw.toUpperCase();
  const known = {
    Q2_K: '2-bit K quant (very small, lower quality)',
    Q3_K_M: '3-bit K-M quant (compact, balanced)',
    Q4_0: '4-bit legacy quant (small, lower quality)',
    Q4_1: '4-bit legacy quant (slightly better than Q4_0)',
    Q4_K_M: '4-bit K-M quant (balanced speed and quality)',
    Q4_K_S: '4-bit K-S quant (faster, slightly lower quality)',
    Q5_0: '5-bit legacy quant (better quality, larger)',
    Q5_1: '5-bit legacy quant (improved quality)',
    Q5_K_M: '5-bit K-M quant (high quality, good speed)',
    Q6_K: '6-bit K quant (high quality, larger)',
    Q8_0: '8-bit quant (near full quality, largest quantized)',
  };

  if (known[normalized]) {
    return `${normalized} - ${known[normalized]}`;
  }

  const bits = normalized.match(/^Q(\d+)/);
  if (bits) {
    return `${normalized} - ${bits[1]}-bit quantization`;
  }

  return raw;
}

export function ModelCard({
  model,
  progress,
  isDownloading,
  onDelete,
  onPull,
  onCopy,
}) {
  const details = model.details || {};
  const modifiedDate = model.modified_at ? new Date(model.modified_at).toLocaleString() : 'Unknown';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white break-all">{model.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Updated {modifiedDate}</p>
        </div>

        <button
          onClick={() => onCopy(model.name)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          title="Copy model name"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-gray-50 dark:bg-gray-700/60 p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Size</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">{formatBytes(model.size)}</p>
        </div>
        <div className="rounded-md bg-gray-50 dark:bg-gray-700/60 p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Quantization</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">{describeQuantization(details.quantization_level)}</p>
        </div>
        <div className="rounded-md bg-gray-50 dark:bg-gray-700/60 p-2 col-span-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Parameters</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">{details.parameter_size || 'N/A'}</p>
        </div>
      </div>

      {progress && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
            <span>{progress.status === 'verifying' ? 'Verifying' : 'Downloading'}</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-2 bg-blue-600 transition-all duration-200"
              style={{ width: `${Math.max(2, progress.percentage)}%` }}
            />
          </div>
          {progress.message && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{progress.message}</p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onPull(model.name)}
          disabled={isDownloading}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Pulling' : 'Pull'}
        </button>
        <button
          onClick={() => onDelete(model.name)}
          disabled={isDownloading}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
