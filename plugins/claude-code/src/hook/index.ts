import { logger } from '../shared/logger.js';
import type { HookInput, HookOutput } from '../shared/types.js';
import { handleSessionStart } from './handlers/session-start.js';
import { handleStop } from './handlers/stop.js';
import { handlePreCompact } from './handlers/pre-compact.js';
import { handleSessionEnd } from './handlers/session-end.js';

async function main(): Promise<void> {
  let input: HookInput;

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf-8');
    input = JSON.parse(raw) as HookInput;
  } catch (err) {
    logger.error('Failed to read/parse stdin:', err);
    process.stdout.write('{}');
    process.exit(0);
  }

  let output: HookOutput;

  try {
    switch (input.hook_event_name) {
      case 'SessionStart':
        output = await handleSessionStart(input);
        break;
      case 'Stop':
        output = await handleStop(input);
        break;
      case 'PreCompact':
        output = await handlePreCompact(input);
        break;
      case 'SessionEnd':
        output = await handleSessionEnd(input);
        break;
      default:
        logger.warn(`Unknown hook event: ${(input as any).hook_event_name}`);
        output = {};
    }
  } catch (err) {
    logger.error(`Hook handler error for ${input.hook_event_name}:`, err);
    // SessionStart returns {}, others return { continue: true }
    output = input.hook_event_name === 'SessionStart' ? {} : { continue: true };
  }

  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main();
