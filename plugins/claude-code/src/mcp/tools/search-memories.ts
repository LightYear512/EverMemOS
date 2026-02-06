import { EverMemOSClient } from '../../shared/evermemos-client.js';
import { logger } from '../../shared/logger.js';
import type { MemoryItem } from '../../shared/types.js';

export const searchMemoriesTool = {
  name: 'search_memories',
  description: 'Search memories from EverMemOS. Supports keyword, vector, hybrid, rrf, and agentic retrieval methods.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query text',
      },
      retrieve_method: {
        type: 'string',
        enum: ['keyword', 'vector', 'hybrid', 'rrf', 'agentic'],
        description: 'Retrieval method (default: rrf)',
      },
      memory_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Memory types to search: episodic_memory, foresight, event_log',
      },
      user_id: {
        type: 'string',
        description: 'Filter by user ID',
      },
      group_id: {
        type: 'string',
        description: 'Filter by group ID',
      },
      top_k: {
        type: 'number',
        description: 'Max number of results (1-100, default: 10)',
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['query'],
  },
};

export async function handleSearchMemories(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const query = args.query as string;
  if (!query) {
    return {
      content: [{ type: 'text', text: 'Error: query parameter is required' }],
      isError: true,
    };
  }

  const client = new EverMemOSClient();

  // Convert memory_types array to comma-separated string
  let memoryTypes: string | undefined;
  if (Array.isArray(args.memory_types) && args.memory_types.length > 0) {
    memoryTypes = args.memory_types.join(',');
  }

  try {
    const response = await client.searchMemories({
      query,
      retrieve_method: (args.retrieve_method as string) || 'rrf',
      memory_types: memoryTypes,
      user_id: args.user_id as string | undefined,
      group_id: args.group_id as string | undefined,
      top_k: (args.top_k as number) || 10,
    });

    if (response.status !== 'ok') {
      return {
        content: [{ type: 'text', text: `Search failed: ${response.message}` }],
        isError: true,
      };
    }

    // Flatten grouped memories
    const memories: MemoryItem[] = [];
    const allScores: number[] = [];
    const result = response.result;

    if (result.memories) {
      for (let gi = 0; gi < result.memories.length; gi++) {
        const group = result.memories[gi];
        const scoreGroup = result.scores?.[gi];
        for (const [groupKey, memList] of Object.entries(group)) {
          const scores = scoreGroup?.[groupKey] || [];
          for (let i = 0; i < memList.length; i++) {
            const mem = { ...memList[i], score: scores[i] };
            memories.push(mem);
            if (scores[i] !== undefined) allScores.push(scores[i]);
          }
        }
      }
    }

    if (memories.length === 0) {
      return {
        content: [{ type: 'text', text: `No memories found for query: "${query}"` }],
      };
    }

    // Format results
    const lines: string[] = [`Found ${memories.length} memories (total: ${result.total_count}):\n`];

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      lines.push(`--- Memory ${i + 1} ---`);
      if (mem.subject) lines.push(`Subject: ${mem.subject}`);
      if (mem.summary) lines.push(`Summary: ${mem.summary}`);
      if (mem.episode) lines.push(`Episode: ${mem.episode}`);
      if (mem.content) lines.push(`Content: ${mem.content}`);
      if (mem.score !== undefined) lines.push(`Score: ${mem.score.toFixed(4)}`);
      if (mem.timestamp) lines.push(`Time: ${mem.timestamp}`);
      if (mem.memory_type) lines.push(`Type: ${mem.memory_type}`);
      lines.push('');
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  } catch (error) {
    logger.error('search_memories error:', error);
    return {
      content: [{
        type: 'text',
        text: `Search error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
