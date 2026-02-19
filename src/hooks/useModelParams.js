import { useState, useEffect, useCallback, useMemo } from 'react';

// Default parameters defined outside the hook
const DEFAULT_PARAMS = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 2048,
  system_prompt: '',
};

/**
 * Hook to manage model parameters with localStorage persistence
 * @param {string} modelName - The current model name for per-model params
 * @returns {Object} - Model params state and methods
 */
export function useModelParams(modelName) {
  // Load model-specific params or defaults
  const [params, setParams] = useState(() => {
    if (!modelName) return DEFAULT_PARAMS;
    
    const saved = localStorage.getItem(`model:${modelName}:params`);
    if (saved) {
      try {
        return { ...DEFAULT_PARAMS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error parsing saved params:', e);
        return DEFAULT_PARAMS;
      }
    }
    return DEFAULT_PARAMS;
  });

  // Load presets from localStorage
  const [presets, setPresets] = useState(() => {
    const saved = localStorage.getItem('modelPresets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing presets:', e);
        return {};
      }
    }
    return {
      'Default': DEFAULT_PARAMS,
      'Creative': { temperature: 0.9, top_p: 0.95, max_tokens: 2048, system_prompt: '' },
      'Precise': { temperature: 0.3, top_p: 0.5, max_tokens: 2048, system_prompt: '' },
      'Concise': { temperature: 0.7, top_p: 0.9, max_tokens: 512, system_prompt: 'Be concise and to the point.' },
    };
  });

  // Save params to localStorage when they change
  useEffect(() => {
    if (modelName) {
      localStorage.setItem(`model:${modelName}:params`, JSON.stringify(params));
    }
  }, [params, modelName]);

  // Save presets to localStorage when they change
  useEffect(() => {
    localStorage.setItem('modelPresets', JSON.stringify(presets));
  }, [presets]);

  // Update a single parameter
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setParams(DEFAULT_PARAMS);
  }, []);

  // Apply a preset
  const applyPreset = useCallback((presetName) => {
    if (presets[presetName]) {
      setParams(presets[presetName]);
    }
  }, [presets]);

  // Save current params as a new preset
  const savePreset = useCallback((presetName) => {
    if (!presetName.trim()) return;
    setPresets(prev => ({
      ...prev,
      [presetName]: { ...params },
    }));
  }, [params]);

  // Delete a preset
  const deletePreset = useCallback((presetName) => {
    if (presetName === 'Default') return; // Don't allow deleting default
    setPresets(prev => {
      const updated = { ...prev };
      delete updated[presetName];
      return updated;
    });
  }, []);

  // Memoize the loaded params to avoid unnecessary re-renders
  const loadedParams = useMemo(() => {
    if (!modelName) return DEFAULT_PARAMS;
    
    const saved = localStorage.getItem(`model:${modelName}:params`);
    if (saved) {
      try {
        return { ...DEFAULT_PARAMS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error parsing saved params:', e);
        return DEFAULT_PARAMS;
      }
    }
    return DEFAULT_PARAMS;
  }, [modelName]);

  // Update params when model changes (using effect with proper cleanup)
  useEffect(() => {
    setParams(loadedParams);
  }, [loadedParams]);

  return {
    params,
    updateParam,
    resetToDefaults,
    presets,
    applyPreset,
    savePreset,
    deletePreset,
  };
}
