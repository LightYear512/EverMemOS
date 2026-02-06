import { sendNewMessages } from './stop.js';
import { logger } from '../../shared/logger.js';
import type { HookInput, HookContinueOutput } from '../../shared/types.js';

export async function handlePreCompact(input: HookInput): Promise<HookContinueOutput> {
  try {
    await sendNewMessages(input);
  } catch (err) {
    logger.error('PreCompact handler error:', err);
  }
  return { continue: true };
}
