import { PreContextBroker } from '../broker/PreContextBroker';
import { PluginRegistration, PluginRegistry } from './PluginRegistry';

export interface PluginUpdatePayload {
  [pluginId: string]: Record<string, any>;
}

export interface DispatchResult {
  success: boolean;
  dispatchedPluginIds: string[];
  failedPluginIds: string[];
  pitRecordsCreated: number;
}

export class PluginUpdateDispatcher {
  /**
   * Extracts a ```json block containing `pluginUpdates` from AI response text and dispatches to plugins.
   */
  public static parseAndDispatch(
    aiResponseText: string,
    registeredPlugins: PluginRegistration[]
  ): DispatchResult {
    if (!aiResponseText || !aiResponseText.trim()) {
      return {
        success: false,
        dispatchedPluginIds: [],
        failedPluginIds: [],
        pitRecordsCreated: 0,
      };
    }

    let payload: PluginUpdatePayload | null = null;

    try {
      const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed && typeof parsed.pluginUpdates === 'object') {
          payload = parsed.pluginUpdates;
        }
      }
    } catch (err) {
      console.warn('[PluginUpdateDispatcher] Failed to parse JSON block from AI response:', err);
      return {
        success: false,
        dispatchedPluginIds: [],
        failedPluginIds: [],
        pitRecordsCreated: 0,
      };
    }

    if (!payload) {
      return {
        success: false,
        dispatchedPluginIds: [],
        failedPluginIds: [],
        pitRecordsCreated: 0,
      };
    }

    return this.dispatch(payload, registeredPlugins);
  }

  /**
   * Dispatches a pre-parsed PluginUpdatePayload to target plugin partitions and PreContextBroker.
   */
  public static dispatch(
    updates: PluginUpdatePayload,
    registeredPlugins: PluginRegistration[]
  ): DispatchResult {
    const activeMap = new Map<string, PluginRegistration>();
    for (const p of registeredPlugins) {
      if (p.enabled) {
        activeMap.set(p.manifest.id, p);
      }
    }

    const dispatchedPluginIds: string[] = [];
    const failedPluginIds: string[] = [];
    let pitRecordsCreated = 0;

    for (const [pluginId, pluginData] of Object.entries(updates)) {
      const reg = activeMap.get(pluginId);
      if (!reg) {
        failedPluginIds.push(pluginId);
        continue;
      }

      // 1. Write isolated plugin storage
      const existing = PluginRegistry.readPluginStorage<Record<string, any>>(pluginId) || {};
      const merged = { ...existing, ...pluginData };
      PluginRegistry.writePluginStorage(pluginId, merged);

      // 2. Dispatch event into PreContextBroker Inbound PIT
      PreContextBroker.enqueuePIT({
        source_plugin_id: 'ai_context_extractor',
        target_plugin_id: pluginId,
        priority: 'high',
        severity: 'info',
        payload: {
          pluginId,
          updates: pluginData,
        },
      });

      pitRecordsCreated++;
      dispatchedPluginIds.push(pluginId);
    }

    return {
      success: dispatchedPluginIds.length > 0,
      dispatchedPluginIds,
      failedPluginIds,
      pitRecordsCreated,
    };
  }
}

export default PluginUpdateDispatcher;
