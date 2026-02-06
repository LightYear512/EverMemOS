import { readFileSync } from 'fs';
import { logger } from './logger.js';
import type { TranscriptEntry, ParsedTranscriptEntry, ContentItem } from './types.js';

function stripSystemReminders(text: string): string {
  return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
}

export function extractContent(entry: TranscriptEntry): string {
  if (!entry.message?.content) return '';

  const content = entry.message.content;

  if (typeof content === 'string') {
    return stripSystemReminders(content);
  }

  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content as ContentItem[]) {
      if (item.type === 'text' && item.text) {
        parts.push(item.text);
      } else if (item.type === 'tool_use' && item.name) {
        parts.push(`[Used tool: ${item.name}]`);
      }
      // Skip tool_result and thinking types
    }
    const joined = parts.join('\n');
    return stripSystemReminders(joined);
  }

  return '';
}

export function readTranscriptFromOffset(
  filePath: string,
  startLine: number,
): ParsedTranscriptEntry[] {
  let fileContent: string;
  try {
    fileContent = readFileSync(filePath, 'utf-8');
  } catch (err) {
    logger.error(`Failed to read transcript: ${filePath}`, err);
    return [];
  }

  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const entries: ParsedTranscriptEntry[] = [];

  for (let i = startLine; i < lines.length; i++) {
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(lines[i]) as TranscriptEntry;
    } catch {
      logger.warn(`Failed to parse transcript line ${i}: ${lines[i].substring(0, 100)}`);
      continue;
    }

    // Skip summary and system type entries
    if (entry.type === 'summary' || entry.type === 'system') {
      continue;
    }

    // Only process user and assistant entries
    if (entry.type !== 'user' && entry.type !== 'assistant') {
      continue;
    }

    const content = extractContent(entry);
    if (!content) continue;

    entries.push({
      uuid: entry.uuid || `line-${i}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      role: entry.type as 'user' | 'assistant',
      content,
      lineNumber: i,
    });
  }

  return entries;
}
