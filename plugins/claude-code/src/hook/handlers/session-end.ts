import { sendNewMessages } from './stop.js';
import { cleanup } from '../../shared/offset-tracker.js';
import { logger } from '../../shared/logger.js';
import type { HookInput, HookContinueOutput } from '../../shared/types.js';

export async function handleSessionEnd(input: HookInput): Promise<HookContinueOutput> {
  try {
    await sendNewMessages(input);
  } catch (err) {
    logger.error('SessionEnd handler error (sendNewMessages):', err);
  }

  try {
    cleanup();
    logger.debug('Offset cleanup done');
  } catch (err) {
    logger.error('SessionEnd handler error (cleanup):', err);
  }

  return { continue: true };
}
