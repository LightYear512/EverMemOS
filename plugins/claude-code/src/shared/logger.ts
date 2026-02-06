import { config } from './config.js';

export const logger = {
  debug(...args: unknown[]): void {
    if (config.debug) {
      process.stderr.write(`[evermemos:debug] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`);
    }
  },
  info(...args: unknown[]): void {
    process.stderr.write(`[evermemos:info] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`);
  },
  warn(...args: unknown[]): void {
    process.stderr.write(`[evermemos:warn] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`);
  },
  error(...args: unknown[]): void {
    process.stderr.write(`[evermemos:error] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`);
  },
};
