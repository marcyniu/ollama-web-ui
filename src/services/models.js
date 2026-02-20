const MODEL_MANAGER_API = process.env.MODEL_MANAGER_API || 'http://localhost:3001';

/**
 * Fetch list of installed models
 * @returns {Promise<Array>} Array of installed model objects
 */
export async function getInstalledModels() {
  try {
    const response = await fetch(`${MODEL_MANAGER_API}/api/models/installed`);
    if (!response.ok) {
      throw new Error(`Failed to fetch installed models: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getInstalledModels:', error);
    throw error;
  }
}

/**
 * Fetch catalog of available models from remote
 * @returns {Promise<Array>} Array of available model objects
 */
export async function getRemoteCatalog() {
  try {
    const response = await fetch(`${MODEL_MANAGER_API}/api/models/remote`);
    if (!response.ok) {
      throw new Error(`Failed to fetch remote catalog: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getRemoteCatalog:', error);
    throw error;
  }
}

/**
 * Install a model
 * @param {string} name - Model name
 * @param {string} [version] - Optional version/tag
 * @returns {Promise<{opId: string}>} Operation ID
 */
export async function installModel(name, version) {
  try {
    const response = await fetch(`${MODEL_MANAGER_API}/api/models/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, version })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to install model: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in installModel:', error);
    throw error;
  }
}

/**
 * Delete a model
 * @param {string} name - Model name
 * @param {string} [version] - Optional version/tag
 * @param {boolean} [force] - Force deletion
 * @returns {Promise<{opId: string}>} Operation ID
 */
export async function deleteModel(name, version, force = false) {
  try {
    const response = await fetch(`${MODEL_MANAGER_API}/api/models/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, version, force })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to delete model: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in deleteModel:', error);
    throw error;
  }
}

/**
 * Get operation status
 * @param {string} opId - Operation ID
 * @returns {Promise<Object>} Operation status object
 */
export async function getOperationStatus(opId) {
  try {
    const response = await fetch(`${MODEL_MANAGER_API}/api/models/status?opId=${opId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch operation status: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getOperationStatus:', error);
    throw error;
  }
}

/**
 * Check if Model Manager is available and enabled
 * @returns {Promise<boolean>} True if available and enabled
 */
export async function checkModelManagerAvailability() {
  try {
    const response = await fetch(`${MODEL_MANAGER_API}/api/health`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.enabled === true;
  } catch (error) {
    console.error('Model Manager API not available:', error);
    return false;
  }
}
