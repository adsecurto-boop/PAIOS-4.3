export interface PluginExportBundle<T = any> {
  schemaVersion: string;
  pluginId: string;
  exportedAt: number;
  data: T;
  checksum?: string;
}

export interface ImportResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const SUPPORTED_MAJOR_VERSION = 1;

/**
 * Exports plugin data into a portable, versioned JSON bundle.
 */
export function exportPluginData<T = any>(pluginId: string, data: T): PluginExportBundle<T> {
  return {
    schemaVersion: '1.0.0',
    pluginId,
    exportedAt: Date.now(),
    data,
  };
}

/**
 * Imports and validates a plugin export bundle, restoring isolated state.
 */
export function importPluginData<T = any>(bundle: any): ImportResult<T> {
  if (!bundle || typeof bundle !== 'object') {
    return {
      success: false,
      error: 'Invalid, missing, or malformed bundle: bundle must be a non-null object.',
    };
  }

  if (!bundle.schemaVersion || typeof bundle.schemaVersion !== 'string') {
    return {
      success: false,
      error: 'Malformed bundle: missing or invalid schemaVersion.',
    };
  }

  if (!bundle.pluginId || typeof bundle.pluginId !== 'string') {
    return {
      success: false,
      error: 'Malformed bundle: missing or invalid pluginId.',
    };
  }

  if (bundle.data === undefined) {
    return {
      success: false,
      error: 'Malformed bundle: missing data payload.',
    };
  }

  // Schema version validation
  const majorVersion = parseInt(bundle.schemaVersion.split('.')[0], 10);
  if (isNaN(majorVersion) || majorVersion > SUPPORTED_MAJOR_VERSION) {
    return {
      success: false,
      error: `Unsupported schema version: ${bundle.schemaVersion}. Supported major version is <= ${SUPPORTED_MAJOR_VERSION}.`,
    };
  }

  return {
    success: true,
    data: bundle.data as T,
  };
}
