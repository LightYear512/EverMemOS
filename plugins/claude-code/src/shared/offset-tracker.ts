import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { config } from './config.js';
import { logger } from './logger.js';
import type { OffsetState } from './types.js';

function sanitizeSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9\-_]/g, '_');
}

function getOffsetPath(sessionId: string): string {
  return join(config.offsetDir, `${sanitizeSessionId(sessionId)}.json`);
}

export function getOffset(sessionId: string): number {
  const filePath = getOffsetPath(sessionId);
  try {
    const data = readFileSync(filePath, 'utf-8');
    const state = JSON.parse(data) as OffsetState;
    return state.lastLine;
  } catch {
    return 0;
  }
}

export function setOffset(sessionId: string, lineNumber: number): void {
  const filePath = getOffsetPath(sessionId);
  const dir = dirname(filePath);

  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // directory may already exist
  }

  const state: OffsetState = {
    lastLine: lineNumber,
    updatedAt: new Date().toISOString(),
  };

  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(state), 'utf-8');
  renameSync(tmpPath, filePath);
}

export function cleanup(): void {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    mkdirSync(config.offsetDir, { recursive: true });
  } catch {
    // ok
  }

  let files: string[];
  try {
    files = readdirSync(config.offsetDir);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = join(config.offsetDir, file);
    try {
      const stat = statSync(filePath);
      if (now - stat.mtimeMs > SEVEN_DAYS_MS) {
        unlinkSync(filePath);
        logger.debug(`Cleaned up old offset file: ${file}`);
      }
    } catch {
      // skip
    }
  }
}
