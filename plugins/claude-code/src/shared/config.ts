import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  url: string;
  userId: string;
  groupPrefix: string;
  timeoutMs: number;
  searchTopK: number;
  retrieveMethod: string;
  contextMaxChars: number;
  offsetDir: string;
  debug: boolean;
}

export function loadConfig(): Config {
  return {
    url: process.env.EVERMEMOS_URL || 'http://localhost:1995',
    userId: process.env.EVERMEMOS_USER_ID || 'claude-code-user',
    groupPrefix: process.env.EVERMEMOS_GROUP_PREFIX || 'cc',
    timeoutMs: parseInt(process.env.EVERMEMOS_TIMEOUT_MS || '10000', 10),
    searchTopK: parseInt(process.env.EVERMEMOS_SEARCH_TOP_K || '10', 10),
    retrieveMethod: process.env.EVERMEMOS_RETRIEVE_METHOD || 'rrf',
    contextMaxChars: parseInt(process.env.EVERMEMOS_CONTEXT_MAX_CHARS || '4000', 10),
    offsetDir: join(homedir(), '.evermemos-plugin', 'offsets'),
    debug: process.env.EVERMEMOS_DEBUG === 'true',
  };
}

export const config = loadConfig();
