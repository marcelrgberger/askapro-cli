import { RoleRegistry } from '../roles/registry.js';
import type { RoleDefinition } from '../roles/loader.js';
import { collectStream } from '../llm/client.js';
import { loadSettings } from '../config/settings.js';
import { getTriageModel } from '../llm/models.js';

export interface TriageResult {
  primaryRole: RoleDefinition | null;
  secondaryRoles: RoleDefinition[];
  confidence: number;
  reasoning: string;
}

const TRIAGE_PROMPT = `You are a triage agent. Analyze the user's question and documents to determine the best expert.

Respond ONLY in the following JSON format:
{
  "primary": "role-id",
  "secondary": ["role-id-2"],
  "confidence": 0.9,
  "reasoning": "Brief explanation"
}

Available roles:
`;

export async function triageQuery(
  query: string,
  documentContext: string,
  roleRegistry: RoleRegistry,
): Promise<TriageResult> {
  // Step 1: Fast keyword matching
  const keywordMatches = roleRegistry.matchByKeywords(query + ' ' + documentContext);

  // If strong keyword match (top match has 3+ triggers), use it directly
  if (keywordMatches.length > 0 && keywordMatches[0].triggers.length >= 3) {
    const primary = roleRegistry.get(keywordMatches[0].roleId)!;
    const secondary = keywordMatches.slice(1, 3)
      .map((m) => roleRegistry.get(m.roleId))
      .filter((r): r is RoleDefinition => r !== undefined);

    return {
      primaryRole: primary,
      secondaryRoles: secondary,
      confidence: 0.85,
      reasoning: `Keyword-Match: ${keywordMatches[0].triggers.join(', ')}`,
    };
  }

  // Step 2: LLM-based classification for ambiguous cases
  try {
    const settings = loadSettings();
    const roles = roleRegistry.getAll();
    const roleList = roles.map((r) => `- ${r.id}: ${r.name} (${r.category})`).join('\n');

    const result = await collectStream({
      model: getTriageModel(),
      messages: [
        {
          role: 'system',
          content: TRIAGE_PROMPT + roleList,
        },
        {
          role: 'user',
          content: `Question: ${query}\n\nDocument context: ${documentContext.slice(0, 2000)}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 200,
    });

    const json = JSON.parse(result.text);
    const primary = roleRegistry.get(json.primary) || null;
    const secondary = (json.secondary || [])
      .map((id: string) => roleRegistry.get(id))
      .filter((r: RoleDefinition | undefined): r is RoleDefinition => r !== undefined);

    return {
      primaryRole: primary,
      secondaryRoles: secondary,
      confidence: json.confidence || 0.5,
      reasoning: json.reasoning || '',
    };
  } catch {
    // Fallback to keyword match
    if (keywordMatches.length > 0) {
      return {
        primaryRole: roleRegistry.get(keywordMatches[0].roleId) || null,
        secondaryRoles: [],
        confidence: 0.5,
        reasoning: 'Keyword-based routing (LLM triage failed)',
      };
    }

    return {
      primaryRole: null,
      secondaryRoles: [],
      confidence: 0,
      reasoning: 'No matching expert found',
    };
  }
}
