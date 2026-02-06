// ===================== Hook Types =====================

export interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'SessionStart' | 'Stop' | 'PreCompact' | 'SessionEnd';
}

export interface SessionStartOutput {
  additionalContext?: string;
}

export interface HookContinueOutput {
  continue: boolean;
}

export type HookOutput = SessionStartOutput | HookContinueOutput | Record<string, never>;

// ===================== Transcript Types =====================

export interface ContentItem {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string | ContentItem[];
}

export interface TranscriptEntry {
  type: 'user' | 'assistant' | 'summary' | 'system';
  message?: TranscriptMessage;
  uuid?: string;
  timestamp?: string;
}

export interface ParsedTranscriptEntry {
  uuid: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
  lineNumber: number;
}

// ===================== EverMemOS API Types =====================

export interface MemorizePayload {
  message_id: string;
  create_time: string;
  sender: string;
  content: string;
  group_id?: string;
  group_name?: string;
  sender_name?: string;
  role?: 'user' | 'assistant';
}

export interface SearchParams {
  query: string;
  retrieve_method?: string;
  memory_types?: string;
  user_id?: string;
  group_id?: string;
  top_k?: number;
}

export interface FetchParams {
  memory_type?: string;
  user_id?: string;
  group_id?: string;
  limit?: number;
  offset?: number;
}

export interface ConversationMetaPayload {
  version: string;
  scene: string;
  scene_desc: Record<string, unknown>;
  name: string;
  description: string;
  group_id: string;
  created_at: string;
  default_timezone: string;
  user_details: Record<string, { full_name: string; role: string; extra: Record<string, unknown> }>;
  tags: string[];
}

export interface ApiResponse<T = unknown> {
  status: string;
  message: string;
  result: T;
}

export interface MemorizeResult {
  saved_memories: unknown[];
  count: number;
  status_info: string;
}

export interface SearchResult {
  memories: Array<Record<string, MemoryItem[]>>;
  scores: Array<Record<string, number[]>>;
  total_count: number;
  has_more: boolean;
  pending_messages: unknown[];
}

export interface MemoryItem {
  memory_type?: string;
  user_id?: string;
  group_id?: string;
  timestamp?: string;
  subject?: string;
  summary?: string;
  episode?: string;
  content?: string;
  score?: number;
  [key: string]: unknown;
}

export interface FetchResult {
  memories: MemoryItem[];
  total_count: number;
  has_more: boolean;
}

// ===================== Offset Types =====================

export interface OffsetState {
  lastLine: number;
  updatedAt: string;
}
