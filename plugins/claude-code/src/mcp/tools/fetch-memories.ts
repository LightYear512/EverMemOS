import { EverMemOSClient } from '../../shared/evermemos-client.js';
import { logger } from '../../shared/logger.js';

export const fetchMemoriesTool = {
  name: 'fetch_memories',
  description: "Fetch memories by type from EverMemOS. Use 'profile' for user info, 'episodic_memory' for past conversations.",
  inputSchema: {
    type: 'object' as const,
    properties: {
      memory_type: {
        type: 'string',
        enum: ['profile', 'episodic_memory', 'foresight', 'event_log'],
        description: 'Type of memory to fetch',
      },
      user_id: {
        type: 'string',
        description: 'Filter by user ID',
      },
      group_id: {
        type: 'string',
        description: 'Filter by group ID',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of memories to return',
      },
      offset: {
        type: 'number',
        description: 'Pagination offset',
      },
    },
  },
};

export async function handleFetchMemories(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const client = new EverMemOSClient();

  try {
    const response = await client.fetchMemories({
      memory_type: args.memory_type as string | undefined,
      user_id: args.user_id as string | undefined,
      group_id: args.group_id as string | undefined,
      limit: args.limit as number | undefined,
      offset: args.offset as number | undefined,
    });

    if (response.status !== 'ok') {
      return {
        content: [{ type: 'text', text: `Fetch failed: ${response.message}` }],
        isError: true,
      };
    }

    const result = response.result;
    const memories = result.memories || [];

    if (memories.length === 0) {
      return {
        content: [{ type: 'text', text: 'No memories found.' }],
      };
    }

    const lines: string[] = [
      `Found ${memories.length} memories (total: ${result.total_count}, has_more: ${result.has_more}):\n`,
    ];

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      lines.push(`--- Memory ${i + 1} ---`);
      if (mem.memory_type) lines.push(`Type: ${mem.memory_type}`);
      if (mem.subject) lines.push(`Subject: ${mem.subject}`);
      if (mem.summary) lines.push(`Summary: ${mem.summary}`);
      if (mem.episode) lines.push(`Episode: ${mem.episode}`);
      if (mem.content) lines.push(`Content: ${mem.content}`);
      if (mem.timestamp) lines.push(`Time: ${mem.timestamp}`);
      if (mem.user_id) lines.push(`User: ${mem.user_id}`);
      if (mem.group_id) lines.push(`Group: ${mem.group_id}`);
      lines.push('');
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  } catch (error) {
    logger.error('fetch_memories error:', error);
    return {
      content: [{
        type: 'text',
        text: `Fetch error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
