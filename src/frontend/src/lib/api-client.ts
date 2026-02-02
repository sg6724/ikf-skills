/**
 * API Client for IKF AI Frontend
 * 
 * This is the ONLY interface between the frontend and backend.
 * All data flows through these API calls - no direct database access.
 * 
 * Architecture:
 *   Frontend (React) -> API Client -> Backend (FastAPI) -> Database (Supabase)
 * 
 * Configuration:
 *   Only requires NEXT_PUBLIC_API_URL environment variable.
 *   All other settings (DB credentials, API keys) stay in the backend.
 */

import type {
    Conversation,
    ConversationListResponse,
    DeleteConversationResponse,
    ArtifactsListResponse,
    HealthResponse,
    SSEEventData,
    ExportFormat,
} from '@/types/api';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Backend API base URL
 * Only configuration needed in frontend - everything else stays in backend
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse SSE event from text line
 */
function parseSSEEvent(chunk: string): SSEEventData | null {
    const lines = chunk.trim().split('\n');
    if (lines.length < 2) return null;

    const eventMatch = lines[0].match(/^event:\s*(.+)$/);
    const dataMatch = lines[1].match(/^data:\s*(.+)$/);

    if (!eventMatch || !dataMatch) return null;

    try {
        const event = eventMatch[1].trim();
        const data = JSON.parse(dataMatch[1]);
        return { event, data } as SSEEventData;
    } catch {
        console.error('Failed to parse SSE event:', chunk);
        return null;
    }
}

/**
 * Handle API response errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        let message = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorJson = JSON.parse(errorText);
            message = errorJson.detail || errorJson.error || message;
        } catch {
            // Use default message if parsing fails
        }
        throw new Error(message);
    }
    return response.json();
}

// ============================================================================
// API Client
// ============================================================================

export const apiClient = {
    /**
     * Get the API base URL (useful for debugging)
     */
    getBaseUrl: () => API_BASE_URL,

    // ==========================================================================
    // Chat API
    // ==========================================================================

    /**
     * Send a chat message and receive streaming response via SSE
     * 
     * @param message - User's message
     * @param conversationId - Optional conversation ID for context
     * @yields SSE events (thinking, tool_call, content, artifact, done, error)
     */
    chat: async function* (
        message: string,
        conversationId: string | null
    ): AsyncGenerator<SSEEventData, void, unknown> {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                conversation_id: conversationId,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chat request failed: ${response.status} - ${errorText}`);
        }

        if (!response.body) {
            throw new Error('No response body received');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Split by double newline (SSE event separator)
                const events = buffer.split('\n\n');
                // Keep the last incomplete chunk in buffer
                buffer = events.pop() || '';

                for (const eventChunk of events) {
                    if (!eventChunk.trim()) continue;

                    const parsed = parseSSEEvent(eventChunk);
                    if (parsed) {
                        yield parsed;
                    }
                }
            }

            // Process any remaining buffer
            if (buffer.trim()) {
                const parsed = parseSSEEvent(buffer);
                if (parsed) {
                    yield parsed;
                }
            }
        } finally {
            reader.releaseLock();
        }
    },

    // ==========================================================================
    // Conversations API
    // ==========================================================================

    conversations: {
        /**
         * List all conversations, most recent first
         * 
         * @param limit - Maximum number of conversations to return (default: 50)
         * @param offset - Pagination offset (default: 0)
         */
        list: async (limit = 50, offset = 0): Promise<ConversationListResponse> => {
            const response = await fetch(
                `${API_BASE_URL}/api/conversations?limit=${limit}&offset=${offset}`
            );
            return handleResponse<ConversationListResponse>(response);
        },

        /**
         * Get a conversation with all its messages
         * 
         * @param id - Conversation ID
         */
        get: async (id: string): Promise<Conversation> => {
            const response = await fetch(`${API_BASE_URL}/api/conversations/${id}`);
            return handleResponse<Conversation>(response);
        },

        /**
         * Delete a conversation and all its messages
         * 
         * @param id - Conversation ID
         */
        delete: async (id: string): Promise<DeleteConversationResponse> => {
            const response = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
                method: 'DELETE',
            });
            return handleResponse<DeleteConversationResponse>(response);
        },
    },

    // ==========================================================================
    // Artifacts API
    // ==========================================================================

    artifacts: {
        /**
         * List all artifacts for a conversation
         * 
         * @param conversationId - Conversation ID
         */
        list: async (conversationId: string): Promise<ArtifactsListResponse> => {
            const response = await fetch(
                `${API_BASE_URL}/api/artifacts/${conversationId}`
            );
            return handleResponse<ArtifactsListResponse>(response);
        },

        /**
         * Get the download URL for an artifact
         * Note: This returns the URL, not the file content
         * 
         * @param conversationId - Conversation ID
         * @param filename - Artifact filename
         */
        getDownloadUrl: (conversationId: string, filename: string): string => {
            return `${API_BASE_URL}/api/artifacts/${conversationId}/${encodeURIComponent(filename)}`;
        },

        /**
         * Download an artifact file
         * 
         * @param conversationId - Conversation ID
         * @param filename - Artifact filename
         */
        download: async (conversationId: string, filename: string): Promise<Blob> => {
            const url = `${API_BASE_URL}/api/artifacts/${conversationId}/${encodeURIComponent(filename)}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download artifact: ${response.status}`);
            }
            return response.blob();
        },
    },

    // ==========================================================================
    // Export API
    // ==========================================================================

    /**
     * Export markdown content to DOCX, PDF, or XLSX
     * 
     * @param content - Markdown content to export
     * @param format - Export format (docx, pdf, xlsx)
     * @param filename - Filename without extension
     * @returns Blob of the exported file
     */
    export: async (
        content: string,
        format: ExportFormat,
        filename: string
    ): Promise<Blob> => {
        const response = await fetch(`${API_BASE_URL}/api/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, format, filename }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Export failed: ${response.status} - ${errorText}`);
        }

        return response.blob();
    },

    // ==========================================================================
    // Health Check
    // ==========================================================================

    /**
     * Check if the backend API is healthy and running
     */
    health: async (): Promise<HealthResponse> => {
        const response = await fetch(`${API_BASE_URL}/health`);
        return handleResponse<HealthResponse>(response);
    },
};

export default apiClient;
