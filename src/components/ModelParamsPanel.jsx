import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Save, Trash2 } from 'lucide-react';

/**
 * Panel for adjusting advanced model parameters
 * @param {Object} props
 * @param {Object} props.params - Current parameters
 * @param {Function} props.updateParam - Function to update a parameter
 * @param {Function} props.resetToDefaults - Function to reset to default values
 * @param {Object} props.presets - Available presets
 * @param {Function} props.applyPreset - Function to apply a preset
 * @param {Function} props.savePreset - Function to save current params as preset
 * @param {Function} props.deletePreset - Function to delete a preset
 */
export function ModelParamsPanel({
  params,
  updateParam,
  resetToDefaults,
  presets,
  applyPreset,
  savePreset,
  deletePreset,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim());
      setNewPresetName('');
      setShowSavePreset(false);
    }
  };

  return (
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors rounded-t-lg"
        aria-label={isExpanded ? "Collapse parameters" : "Expand parameters"}
      >
        <span className="font-semibold text-gray-800 dark:text-white">
          Model Parameters
        </span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-200 dark:border-gray-700">
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Presets
            </label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(presets).map((presetName) => (
                <div key={presetName} className="flex items-center gap-1">
                  <button
                    onClick={() => applyPreset(presetName)}
                    className="px-3 py-1 text-sm rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    {presetName}
                  </button>
                  {presetName !== 'Default' && presetName !== 'Creative' && presetName !== 'Precise' && presetName !== 'Concise' && (
                    <button
                      onClick={() => deletePreset(presetName)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
                      aria-label={`Delete ${presetName} preset`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Save New Preset */}
            <div className="mt-2">
              {!showSavePreset ? (
                <button
                  onClick={() => setShowSavePreset(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Save current as preset
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Preset name"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSavePreset();
                      }
                    }}
                  />
                  <button
                    onClick={handleSavePreset}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    aria-label="Save preset"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowSavePreset(false);
                      setNewPresetName('');
                    }}
                    className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temperature: {params.temperature.toFixed(2)}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (0 = deterministic, 1 = creative)
              </span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={params.temperature}
                onChange={(e) => updateParam('temperature', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                aria-label="Temperature slider"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={params.temperature}
                onChange={(e) => updateParam('temperature', parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                aria-label="Temperature input"
              />
            </div>
          </div>

          {/* Top P */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Top P: {params.top_p.toFixed(2)}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (nucleus sampling threshold)
              </span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={params.top_p}
                onChange={(e) => updateParam('top_p', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                aria-label="Top P slider"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={params.top_p}
                onChange={(e) => updateParam('top_p', parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                aria-label="Top P input"
              />
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Tokens: {params.max_tokens}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (maximum response length)
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="8192"
              step="128"
              value={params.max_tokens}
              onChange={(e) => updateParam('max_tokens', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              aria-label="Max tokens input"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              System Prompt
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (instructions for the model)
              </span>
            </label>
            <textarea
              value={params.system_prompt}
              onChange={(e) => updateParam('system_prompt', e.target.value)}
              placeholder="Enter system prompt (optional)..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              aria-label="System prompt textarea"
            />
          </div>

          {/* Reset Button */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Reset to defaults"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
