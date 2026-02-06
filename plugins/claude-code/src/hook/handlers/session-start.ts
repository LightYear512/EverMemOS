import { basename } from 'path';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { EverMemOSClient } from '../../shared/evermemos-client.js';
import type { HookInput, SessionStartOutput, MemoryItem } from '../../shared/types.js';

export async function handleSessionStart(input: HookInput): Promise<SessionStartOutput> {
  const client = new EverMemOSClient(undefined, 5000); // shorter timeout for session start

  const available = await client.isAvailable();
  if (!available) {
    logger.debug('EverMemOS not available, skipping context injection');
    return {};
  }

  const projectName = basename(input.cwd);
  logger.debug(`SessionStart for project: ${projectName}`);

  // Parallel requests for episodic memories and user profile
  const [searchRes, profileRes] = await Promise.allSettled([
    client.searchMemories({
      query: projectName,
      retrieve_method: config.retrieveMethod,
      memory_types: 'episodic_memory',
      top_k: config.searchTopK,
    }),
    client.fetchMemories({
      memory_type: 'profile',
      limit: 3,
    }),
  ]);

  const parts: string[] = [];

  // Format user profile
  if (profileRes.status === 'fulfilled' && profileRes.value.result?.memories?.length) {
    parts.push('## User Profile');
    for (const mem of profileRes.value.result.memories) {
      const content = mem.content || mem.summary || '';
      if (content) parts.push(`- ${content}`);
    }
  }

  // Format episodic memories
  if (searchRes.status === 'fulfilled' && searchRes.value.result?.memories?.length) {
    const memories: MemoryItem[] = [];
    for (const group of searchRes.value.result.memories) {
      for (const memList of Object.values(group)) {
        memories.push(...memList);
      }
    }

    if (memories.length > 0) {
      parts.push('## Relevant Past Context');
      for (const mem of memories) {
        const time = mem.timestamp || '';
        const desc = mem.summary || mem.episode || mem.subject || '';
        if (desc) {
          parts.push(`- [${time}] ${desc}`);
        }
      }
    }
  }

  if (parts.length === 0) {
    return {};
  }

  let markdown = '# EverMemOS Memories\n\n' + parts.join('\n');

  // Truncate to contextMaxChars
  if (markdown.length > config.contextMaxChars) {
    markdown = markdown.substring(0, config.contextMaxChars) + '\n\n...(truncated)';
  }

  logger.debug(`Injecting ${markdown.length} chars of context`);
  return { additionalContext: markdown };
}
