import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getOffset, setOffset, cleanup } from '../src/shared/offset-tracker.js';
import { mkdirSync, rmSync, existsSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Override config offset dir for tests
const TEST_OFFSET_DIR = join(tmpdir(), 'evermemos-test-offsets-' + process.pid);

// We need to mock the config to use a test directory
import { config } from '../src/shared/config.js';

beforeEach(() => {
  // Override config offset dir
  (config as any).offsetDir = TEST_OFFSET_DIR;
  if (existsSync(TEST_OFFSET_DIR)) {
    rmSync(TEST_OFFSET_DIR, { recursive: true });
  }
  mkdirSync(TEST_OFFSET_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_OFFSET_DIR)) {
    rmSync(TEST_OFFSET_DIR, { recursive: true });
  }
});

describe('offset-tracker', () => {
  it('returns 0 for unknown session', () => {
    expect(getOffset('nonexistent-session')).toBe(0);
  });

  it('stores and retrieves offset', () => {
    setOffset('test-session', 42);
    expect(getOffset('test-session')).toBe(42);
  });

  it('overwrites previous offset', () => {
    setOffset('test-session', 10);
    setOffset('test-session', 25);
    expect(getOffset('test-session')).toBe(25);
  });

  it('sanitizes session IDs with special characters', () => {
    setOffset('session/with:special@chars!', 5);
    expect(getOffset('session/with:special@chars!')).toBe(5);
    // Verify file exists with sanitized name
    expect(existsSync(join(TEST_OFFSET_DIR, 'session_with_special_chars_.json'))).toBe(true);
  });

  it('handles concurrent sessions independently', () => {
    setOffset('session-a', 10);
    setOffset('session-b', 20);
    expect(getOffset('session-a')).toBe(10);
    expect(getOffset('session-b')).toBe(20);
  });

  describe('cleanup', () => {
    it('removes files older than 7 days', () => {
      const filePath = join(TEST_OFFSET_DIR, 'old-session.json');
      writeFileSync(filePath, JSON.stringify({ lastLine: 0, updatedAt: '2020-01-01' }));

      // Set modification time to 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      utimesSync(filePath, eightDaysAgo, eightDaysAgo);

      cleanup();
      expect(existsSync(filePath)).toBe(false);
    });

    it('keeps recent files', () => {
      setOffset('recent-session', 5);
      cleanup();
      expect(getOffset('recent-session')).toBe(5);
    });
  });
});
