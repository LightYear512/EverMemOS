// CRITICAL: Redirect console.log to stderr BEFORE any other imports
// MCP uses stdio transport where stdout is reserved for JSON-RPC protocol messages
console.log = (...args: any[]) => {
  console.error('[evermemos:mcp:redirected]', ...args);
};

// Using low-level Server (not McpServer) because we define raw JSON schemas, not Zod schemas
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../shared/logger.js';
import { handleSearchMemories, searchMemoriesTool } from './tools/search-memories.js';
import { handleFetchMemories, fetchMemoriesTool } from './tools/fetch-memories.js';

const server = new Server(
  {
    name: 'evermemos-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [searchMemoriesTool, fetchMemoriesTool],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_memories':
        return await handleSearchMemories(args || {});
      case 'fetch_memories':
        return await handleFetchMemories(args || {});
      default:
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    logger.error(`Tool ${name} failed:`, error);
    return {
      content: [{
        type: 'text' as const,
        text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('EverMemOS MCP server started');
}

main().catch((error) => {
  logger.error('Fatal MCP error:', error);
  process.exit(0);
});
