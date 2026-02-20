import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Server } from 'lucide-react';
import { useModels } from '../hooks/useModels';
import { ModelCard } from '../components/ModelCard';
import { ModelActionModal } from '../components/ModelActionModal';

/**
 * ModelManager page - main interface for model lifecycle management
 */
export function ModelManager({ onClose }) {
  const {
    installedModels,
    remoteCatalog,
    loading,
    error,
    isAvailable,
    refreshInstalled,
    refreshCatalog,
    install,
    remove,
    isInstalled
  } = useModels();

  const [activeTab, setActiveTab] = useState('installed');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentOpId, setCurrentOpId] = useState(null);
  const [currentOperation, setCurrentOperation] = useState(null);
  const [currentModel, setCurrentModel] = useState(null);
  const [operatingModels, setOperatingModels] = useState(new Set());

  // Load data on mount
  useEffect(() => {
    if (isAvailable) {
      refreshInstalled();
      refreshCatalog();
    }
  }, [isAvailable, refreshInstalled, refreshCatalog]);

  const handleInstall = async (model) => {
    try {
      setOperatingModels(prev => new Set(prev).add(model.name));
      const opId = await install(model.name);
      setCurrentOpId(opId);
      setCurrentOperation('install');
      setCurrentModel(model.name);
      setModalOpen(true);
    } catch (err) {
      console.error('Failed to start installation:', err);
      setOperatingModels(prev => {
        const next = new Set(prev);
        next.delete(model.name);
        return next;
      });
    }
  };

  const handleDelete = async (model) => {
    // TODO: Replace with custom confirmation modal for better UX
    if (!confirm(`Are you sure you want to delete ${model.name}?`)) {
      return;
    }

    try {
      setOperatingModels(prev => new Set(prev).add(model.name));
      const opId = await remove(model.name);
      setCurrentOpId(opId);
      setCurrentOperation('delete');
      setCurrentModel(model.name);
      setModalOpen(true);
    } catch (err) {
      console.error('Failed to start deletion:', err);
      setOperatingModels(prev => {
        const next = new Set(prev);
        next.delete(model.name);
        return next;
      });
    }
  };

  const handleOperationComplete = (operation) => {
    setOperatingModels(prev => {
      const next = new Set(prev);
      next.delete(currentModel);
      return next;
    });

    if (operation.status === 'completed') {
      // Refresh the installed models list
      refreshInstalled();
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'installed') {
      refreshInstalled();
    } else {
      refreshCatalog();
    }
  };

  if (!isAvailable) {
    return (
      <div className="flex items-center justify-center flex-1 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Model Manager Not Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The Model Manager backend is not enabled or not accessible. 
            Please ensure the backend server is running with ENABLE_MODEL_MANAGER=true.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Model Manager
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Back to Chat
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'installed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Installed ({installedModels.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'available'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Available ({remoteCatalog.length})
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (activeTab === 'installed' ? installedModels.length === 0 : remoteCatalog.length === 0) ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading models...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'installed' ? (
              installedModels.length > 0 ? (
                installedModels.map((model) => (
                  <ModelCard
                    key={model.name}
                    model={model}
                    isInstalled={true}
                    onDelete={handleDelete}
                    isOperating={operatingModels.has(model.name)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-600 dark:text-gray-400">
                  No models installed. Switch to "Available" tab to install models.
                </div>
              )
            ) : (
              remoteCatalog.length > 0 ? (
                remoteCatalog.map((model) => (
                  <ModelCard
                    key={model.name}
                    model={model}
                    isInstalled={isInstalled(model.name)}
                    onInstall={handleInstall}
                    onDelete={handleDelete}
                    isOperating={operatingModels.has(model.name)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-600 dark:text-gray-400">
                  No models available in catalog.
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Operation Modal */}
      <ModelActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        opId={currentOpId}
        operationType={currentOperation}
        modelName={currentModel}
        onComplete={handleOperationComplete}
      />
    </div>
  );
}
