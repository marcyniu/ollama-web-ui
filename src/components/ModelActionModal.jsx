import { X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useModelOperation } from '../hooks/useModels';
import { useEffect, useRef } from 'react';

/**
 * Modal for displaying model install/delete progress
 */
export function ModelActionModal({ 
  isOpen, 
  onClose, 
  opId, 
  operationType, 
  modelName,
  onComplete 
}) {
  const { operation, polling } = useModelOperation(opId, onComplete);
  const logsEndRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [operation?.logs]);

  if (!isOpen) return null;

  const isCompleted = operation?.status === 'completed';
  const isFailed = operation?.status === 'failed';
  const isRunning = operation?.status === 'running';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {operationType === 'install' ? 'Installing' : 'Deleting'} {modelName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
            disabled={isRunning}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {/* Status */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {isRunning && (
                <>
                  <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    In Progress...
                  </span>
                </>
              )}
              {isCompleted && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    Completed Successfully
                  </span>
                </>
              )}
              {isFailed && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    Failed
                  </span>
                </>
              )}
            </div>

            {/* Progress Bar */}
            {operation && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isFailed ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${operation.progress}%` }}
                />
              </div>
            )}
            {operation && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {operation.progress}% complete
              </div>
            )}
          </div>

          {/* Logs */}
          {operation?.logs && operation.logs.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-64 overflow-auto font-mono text-sm">
              {operation.logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.level === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : log.level === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-gray-500 dark:text-gray-500 mr-2">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}

          {!operation && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Loading operation status...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isRunning
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? 'Operation in progress...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
