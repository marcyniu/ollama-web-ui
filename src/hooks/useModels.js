import { useState, useEffect, useCallback } from 'react';
import { 
  getInstalledModels, 
  getRemoteCatalog, 
  installModel, 
  deleteModel,
  getOperationStatus,
  checkModelManagerAvailability 
} from '../services/models';

/**
 * Hook for managing models - fetching, installing, and deleting
 */
export function useModels() {
  const [installedModels, setInstalledModels] = useState([]);
  const [remoteCatalog, setRemoteCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if Model Manager is available
  const checkAvailability = useCallback(async () => {
    const available = await checkModelManagerAvailability();
    setIsAvailable(available);
    return available;
  }, []);

  // Fetch installed models
  const refreshInstalled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const models = await getInstalledModels();
      setInstalledModels(models);
      return models;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch remote catalog
  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await getRemoteCatalog();
      setRemoteCatalog(catalog);
      return catalog;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Install a model - returns operation ID
  const install = useCallback(async (name, version) => {
    try {
      const { opId } = await installModel(name, version);
      return opId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete a model - returns operation ID
  const remove = useCallback(async (name, version, force = false) => {
    try {
      const { opId } = await deleteModel(name, version, force);
      return opId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Check if a model is installed
  const isInstalled = useCallback((modelName) => {
    return installedModels.some(m => m.name === modelName);
  }, [installedModels]);

  // Initial load
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return {
    installedModels,
    remoteCatalog,
    loading,
    error,
    isAvailable,
    refreshInstalled,
    refreshCatalog,
    install,
    remove,
    isInstalled,
    checkAvailability
  };
}

/**
 * Hook for tracking a specific model operation (install/delete)
 * @param {string} opId - Operation ID to track
 * @param {Function} onComplete - Callback when operation completes
 */
export function useModelOperation(opId, onComplete) {
  const [operation, setOperation] = useState(null);

  useEffect(() => {
    if (!opId) return;
    
    let isActive = true;
    
    const pollInterval = setInterval(async () => {
      try {
        const status = await getOperationStatus(opId);
        if (isActive) {
          setOperation(status);

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            if (onComplete) {
              onComplete(status);
            }
          }
        }
      } catch (error) {
        console.error('Error polling operation status:', error);
        clearInterval(pollInterval);
      }
    }, 1000); // Poll every second

    return () => {
      isActive = false;
      clearInterval(pollInterval);
    };
  }, [opId, onComplete]);

  return {
    operation
  };
}
