/**
 * API Types for IKF AI Frontend
 * 
 * These types match the backend Pydantic models and API responses.
 * Frontend communicates ONLY with the backend API - never directly with the database.
 * 
 * Architecture:
 *   Frontend -> Backend API -> Database
 */

// ============================================================================
// Chat Types
// ============================================================================

/**
 * Request payload for POST /api/chat
 */
export interface ChatRequest {
  message: string;
  conversation_id: string | null;
}

/**
 * SSE Event types received from the chat streaming endpoint
 */
export type SSEEventType = 'thinking' | 'tool_call' | 'content' | 'artifact' | 'done' | 'error';

/**
 * Thinking event - Agent's internal reasoning
 */
export interface ThinkingEvent {
  step: string;
  content: string;
}

/**
 * Tool call event - Tool being invoked by the agent
 */
export interface ToolCallEvent {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

/**
 * Content event - Streamed response content chunk
 */
export interface ContentEvent {
  delta: string;
}

/**
 * Artifact event - Generated file information
 */
export interface ArtifactEvent {
  filename: string;
  type: string;
  url: string;
  size_bytes: number;
}

/**
 * Done event - Completion signal with IDs
 */
export interface DoneEvent {
  conversation_id: string;
  message_id: string;
}

/**
 * Error event - Error information
 */
export interface ErrorEvent {
  message: string;
  type: string;
}

/**
 * Union type for all SSE event data
 */
export type SSEEventData = 
  | { event: 'thinking'; data: ThinkingEvent }
  | { event: 'tool_call'; data: ToolCallEvent }
  | { event: 'content'; data: ContentEvent }
  | { event: 'artifact'; data: ArtifactEvent }
  | { event: 'done'; data: DoneEvent }
  | { event: 'error'; data: ErrorEvent };

// ============================================================================
// Conversation Types
// ============================================================================

/**
 * Thinking step within a message
 */
export interface ThinkingStep {
  type: 'thinking' | 'tool_call' | 'tool_result';
  name?: string;
  content?: string;
}

/**
 * Artifact/file information
 */
export interface ArtifactInfo {
  filename: string;
  type: string;
  url: string;
  size_bytes?: number;
}

/**
 * A single message in a conversation
 * Matches MessageResponse from backend
 */
export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking_steps?: ThinkingStep[];
  artifacts?: ArtifactInfo[];
  created_at?: string;
}

/**
 * Conversation summary for listing
 * Matches ConversationSummaryResponse from backend
 */
export interface ConversationSummary {
  id: string;
  title: string;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Full conversation with messages
 * Matches ConversationResponse from backend
 */
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

/**
 * Response from GET /api/conversations
 */
export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total: number;
}

/**
 * Response from DELETE /api/conversations/{id}
 */
export interface DeleteConversationResponse {
  status: 'deleted';
  conversation_id: string;
}

// ============================================================================
// Artifact Types
// ============================================================================

/**
 * Response from GET /api/artifacts/{conversation_id}
 */
export interface ArtifactsListResponse {
  artifacts: ArtifactInfo[];
  total: number;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'docx' | 'pdf' | 'xlsx';

/**
 * Request payload for POST /api/export
 */
export interface ExportRequest {
  content: string;
  format: ExportFormat;
  filename: string;
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Response from GET /health
 */
export interface HealthResponse {
  status: 'healthy';
  app: string;
  version: string;
}
