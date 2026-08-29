import { PluginSchemaField, PluginRegistration } from './PluginRegistry';

export interface ActivePluginSchema {
  pluginId: string;
  pluginName: string;
  fields: PluginSchemaField[];
  currentData: Record<string, any>;
}

export interface PluginPromptInstructions {
  systemInstruction: string;
  requiredFieldsSummary: Record<string, string[]>;
  totalMissingFields: number;
}

export class PluginContextExtractor {
  /**
   * Generates dynamic AI system prompt instructions based on active plugin schemas and missing required fields.
   */
  public static generatePluginPromptInstructions(schemas: ActivePluginSchema[]): PluginPromptInstructions {
    if (!schemas || schemas.length === 0) {
      return {
        systemInstruction: '',
        requiredFieldsSummary: {},
        totalMissingFields: 0,
      };
    }

    let totalMissingFields = 0;
    const missingSummary: Record<string, string[]> = {};
    const instructionLines: string[] = [
      '### ACTIVE PLUGIN SCHEMA INSTRUCTIONS',
      'The user has active dynamic plugins. When conversing, actively discover any missing required fields in a natural, conversational manner.',
      'When the user provides plugin information, you MUST output a structured JSON block enclosed in ```json with the root key "pluginUpdates".',
    ];

    for (const schema of schemas) {
      const missingFields: string[] = [];
      const fieldPrompts: string[] = [];

      for (const field of schema.fields) {
        const hasValue = schema.currentData && schema.currentData[field.name] !== undefined;
        if (field.required && !hasValue) {
          missingFields.push(field.name);
          totalMissingFields++;
          if (field.aiPromptHint) {
            fieldPrompts.push(`- ${field.name}: ${field.aiPromptHint}`);
          } else {
            fieldPrompts.push(`- ${field.name} (${field.type})`);
          }
        }
      }

      missingSummary[schema.pluginId] = missingFields;

      if (fieldPrompts.length > 0) {
        instructionLines.push(`\nPlugin: ${schema.pluginName} (ID: ${schema.pluginId})`);
        instructionLines.push('Missing required fields to discover:');
        instructionLines.push(...fieldPrompts);
      }
    }

    instructionLines.push(
      '\nFormat your output as:\n```json\n{\n  "pluginUpdates": {\n    "<pluginId>": { "<fieldName>": <value> }\n  }\n}\n```'
    );

    return {
      systemInstruction: instructionLines.join('\n'),
      requiredFieldsSummary: missingSummary,
      totalMissingFields,
    };
  }

  /**
   * Assembles ActivePluginSchema instances from active plugin registrations and storage snapshot.
   */
  public static buildActiveSchemas(
    activePlugins: PluginRegistration[],
    currentStorageSnapshot: Record<string, Record<string, any>> = {}
  ): ActivePluginSchema[] {
    return activePlugins
      .filter((p) => p.enabled)
      .map((p) => ({
        pluginId: p.manifest.id,
        pluginName: p.manifest.name,
        fields: p.manifest.schemaFields || [],
        currentData: currentStorageSnapshot[p.manifest.id] || {},
      }));
  }
}

export default PluginContextExtractor;
