import { describe, it, expect } from 'vitest';
import { readTranscriptFromOffset, extractContent } from '../src/shared/transcript-parser.js';
import { join } from 'path';
import type { TranscriptEntry } from '../src/shared/types.js';

const FIXTURE_PATH = join(__dirname, 'fixtures', 'sample-transcript.jsonl');

describe('extractContent', () => {
  it('extracts string content directly', () => {
    const entry: TranscriptEntry = {
      type: 'user',
      message: { role: 'user', content: 'Hello world' },
    };
    expect(extractContent(entry)).toBe('Hello world');
  });

  it('extracts text from ContentItem array', () => {
    const entry: TranscriptEntry = {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Line 1' },
          { type: 'text', text: 'Line 2' },
        ],
      },
    };
    expect(extractContent(entry)).toBe('Line 1\nLine 2');
  });

  it('generates tool_use summary', () => {
    const entry: TranscriptEntry = {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Analyzing' },
          { type: 'tool_use', name: 'read_file', input: {} },
        ],
      },
    };
    const result = extractContent(entry);
    expect(result).toContain('Analyzing');
    expect(result).toContain('[Used tool: read_file]');
  });

  it('skips tool_result and thinking types', () => {
    const entry: TranscriptEntry = {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'tool_result', content: 'should be skipped' },
          { type: 'thinking', text: 'should be skipped' },
        ],
      },
    };
    expect(extractContent(entry)).toBe('Hello');
  });

  it('strips system-reminder tags', () => {
    const entry: TranscriptEntry = {
      type: 'user',
      message: {
        role: 'user',
        content: 'Before <system-reminder>hidden</system-reminder> after',
      },
    };
    expect(extractContent(entry)).toBe('Before  after');
  });

  it('returns empty string for missing content', () => {
    const entry: TranscriptEntry = { type: 'user' };
    expect(extractContent(entry)).toBe('');
  });
});

describe('readTranscriptFromOffset', () => {
  it('reads all entries from offset 0', () => {
    const entries = readTranscriptFromOffset(FIXTURE_PATH, 0);
    // 7 lines total, but summary (line 4) and system (line 5) are skipped = 5 entries
    expect(entries.length).toBe(5);
    expect(entries[0].uuid).toBe('msg-001');
    expect(entries[0].role).toBe('user');
    expect(entries[0].content).toBe('Hello, can you help me with the project?');
  });

  it('reads entries from a given offset', () => {
    const entries = readTranscriptFromOffset(FIXTURE_PATH, 3);
    // Lines 3-6: assistant(3), summary(4-skip), system(5-skip), user(6)
    expect(entries.length).toBe(2);
    expect(entries[0].uuid).toBe('msg-004');
    expect(entries[0].content).toContain('Let me analyze this');
    expect(entries[0].content).toContain('[Used tool: read_file]');
  });

  it('skips summary and system entries', () => {
    const entries = readTranscriptFromOffset(FIXTURE_PATH, 0);
    const types = entries.map(e => e.role);
    expect(types).not.toContain('summary');
    expect(types).not.toContain('system');
  });

  it('strips system-reminder from content', () => {
    const entries = readTranscriptFromOffset(FIXTURE_PATH, 6);
    expect(entries.length).toBe(1);
    expect(entries[0].content).toBe('Thanks  for the help');
    expect(entries[0].content).not.toContain('system-reminder');
  });

  it('returns empty array for non-existent file', () => {
    const entries = readTranscriptFromOffset('/nonexistent/file.jsonl', 0);
    expect(entries).toEqual([]);
  });

  it('returns empty array when offset exceeds file lines', () => {
    const entries = readTranscriptFromOffset(FIXTURE_PATH, 100);
    expect(entries).toEqual([]);
  });

  it('tracks line numbers correctly', () => {
    const entries = readTranscriptFromOffset(FIXTURE_PATH, 0);
    expect(entries[0].lineNumber).toBe(0);
    expect(entries[1].lineNumber).toBe(1);
  });
});
