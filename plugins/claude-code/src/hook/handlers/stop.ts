import { basename } from 'path';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { EverMemOSClient } from '../../shared/evermemos-client.js';
import { readTranscriptFromOffset } from '../../shared/transcript-parser.js';
import { getOffset, setOffset } from '../../shared/offset-tracker.js';
import type { HookInput, HookContinueOutput, MemorizePayload, ConversationMetaPayload } from '../../shared/types.js';

export async function sendNewMessages(input: HookInput): Promise<void> {
  const client = new EverMemOSClient();
  const sessionId = input.session_id;
  const transcriptPath = input.transcript_path;

  if (!transcriptPath) {
    logger.debug('No transcript path, skipping');
    return;
  }

  const offset = getOffset(sessionId);
  const entries = readTranscriptFromOffset(transcriptPath, offset);

  if (entries.length === 0) {
    logger.debug('No new transcript entries');
    return;
  }

  logger.debug(`Processing ${entries.length} new entries from offset ${offset}`);

  const groupId = `${config.groupPrefix}-${sessionId}`;
  const groupName = basename(input.cwd);

  // On first send, save conversation metadata
  if (offset === 0) {
    try {
      const meta: ConversationMetaPayload = {
        version: '1.0.0',
        scene: 'assistant',
        scene_desc: {},
        name: groupName,
        description: `Claude Code session: ${groupName}`,
        group_id: groupId,
        created_at: new Date().toISOString(),
        default_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        user_details: {
          [config.userId]: { full_name: 'User', role: 'user', extra: {} },
          assistant: { full_name: 'Claude', role: 'assistant', extra: {} },
        },
        tags: ['claude-code', groupName],
      };
      await client.saveConversationMeta(meta);
      logger.debug('Conversation metadata saved');
    } catch (err) {
      logger.warn('Failed to save conversation metadata:', err);
      // Continue anyway
    }
  }

  let lastSuccessLine = offset;

  for (const entry of entries) {
    const payload: MemorizePayload = {
      message_id: entry.uuid,
      create_time: entry.timestamp,
      sender: entry.role === 'user' ? config.userId : 'assistant',
      content: entry.content,
      group_id: groupId,
      group_name: groupName,
      sender_name: entry.role === 'user' ? 'User' : 'Claude',
      role: entry.role,
    };

    try {
      await client.storeMessage(payload);
      lastSuccessLine = entry.lineNumber + 1;
    } catch (err) {
      logger.error(`Failed to store message ${entry.uuid}:`, err);
      break; // Preserve order
    }
  }

  if (lastSuccessLine > offset) {
    setOffset(sessionId, lastSuccessLine);
    logger.debug(`Offset updated to ${lastSuccessLine}`);
  }
}

export async function handleStop(input: HookInput): Promise<HookContinueOutput> {
  try {
    await sendNewMessages(input);
  } catch (err) {
    logger.error('Stop handler error:', err);
  }
  return { continue: true };
}
