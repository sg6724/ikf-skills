'use client';

/**
 * useChat Hook
 * 
 * React hook for managing chat state with SSE streaming.
 * Handles sending messages, receiving streaming responses, and state management.
 * 
 * All API calls go through the apiClient - no direct database access.
 */

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Message, ArtifactInfo, ThinkingStep } from '@/types/api';

interface UseChatOptions {
    /** Callback when an artifact is received */
    onArtifact?: (artifact: ArtifactInfo) => void;
    /** Callback when an error occurs */
    onError?: (error: string) => void;
    /** Initial conversation ID */
    initialConversationId?: string | null;
}

interface UseChatReturn {
    /** List of messages in the current conversation */
    messages: Message[];
    /** Whether a request is in progress */
    isLoading: boolean;
    /** Current error message, if any */
    error: string | null;
    /** Current conversation ID */
    conversationId: string | null;
    /** Send a new message */
    sendMessage: (content: string) => Promise<void>;
    /** Load an existing conversation */
    loadConversation: (id: string) => Promise<void>;
    /** Clear the current conversation (start new) */
    clearConversation: () => void;
    /** Clear error state */
    clearError: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const { onArtifact, onError, initialConversationId = null } = options;

    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use ref for conversation ID to avoid stale closures in async operations
    const conversationIdRef = useRef<string | null>(initialConversationId);
    const [conversationId, setConversationId] = useState<string | null>(initialConversationId);

    /**
     * Send a message and handle streaming response
     */
    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        // Create user message with temporary ID
        const userMessage: Message = {
            id: `temp_user_${Date.now()}`,
            conversation_id: conversationIdRef.current || '',
            role: 'user',
            content: content.trim(),
        };

        // Create assistant message placeholder
        const assistantMessage: Message = {
            id: `temp_assistant_${Date.now()}`,
            conversation_id: conversationIdRef.current || '',
            role: 'assistant',
            content: '',
            thinking_steps: [],
            artifacts: [],
        };

        // Add both messages to state
        setMessages(prev => [...prev, userMessage, assistantMessage]);

        try {
            for await (const event of apiClient.chat(content, conversationIdRef.current)) {
                switch (event.event) {
                    case 'thinking': {
                        const thinkingStep: ThinkingStep = {
                            type: 'thinking',
                            content: event.data.content,
                        };
                        setMessages(prev => {
                            const updated = [...prev];
                            const lastMessage = updated[updated.length - 1];
                            if (lastMessage.role === 'assistant') {
                                lastMessage.thinking_steps = [
                                    ...(lastMessage.thinking_steps || []),
                                    thinkingStep,
                                ];
                            }
                            return updated;
                        });
                        break;
                    }

                    case 'tool_call': {
                        const toolStep: ThinkingStep = {
                            type: 'tool_call',
                            name: event.data.name,
                        };
                        setMessages(prev => {
                            const updated = [...prev];
                            const lastMessage = updated[updated.length - 1];
                            if (lastMessage.role === 'assistant') {
                                lastMessage.thinking_steps = [
                                    ...(lastMessage.thinking_steps || []),
                                    toolStep,
                                ];
                            }
                            return updated;
                        });
                        break;
                    }

                    case 'content': {
                        setMessages(prev => {
                            const updated = [...prev];
                            const lastIdx = updated.length - 1;
                            const lastMessage = updated[lastIdx];
                            if (lastMessage?.role === 'assistant') {
                                // Create new object to avoid mutation
                                updated[lastIdx] = {
                                    ...lastMessage,
                                    content: (lastMessage.content || '') + event.data.delta,
                                };
                            }
                            return updated;
                        });
                        break;
                    }

                    case 'artifact': {
                        const artifactInfo: ArtifactInfo = {
                            filename: event.data.filename,
                            type: event.data.type,
                            url: event.data.url,
                            size_bytes: event.data.size_bytes,
                        };
                        setMessages(prev => {
                            const updated = [...prev];
                            const lastMessage = updated[updated.length - 1];
                            if (lastMessage.role === 'assistant') {
                                lastMessage.artifacts = [
                                    ...(lastMessage.artifacts || []),
                                    artifactInfo,
                                ];
                            }
                            return updated;
                        });
                        onArtifact?.(artifactInfo);
                        break;
                    }

                    case 'done': {
                        // Update conversation ID and message ID
                        conversationIdRef.current = event.data.conversation_id;
                        setConversationId(event.data.conversation_id);
                        setMessages(prev => {
                            const updated = [...prev];
                            const lastMessage = updated[updated.length - 1];
                            if (lastMessage.role === 'assistant') {
                                lastMessage.id = event.data.message_id;
                                lastMessage.conversation_id = event.data.conversation_id;
                            }
                            // Also update user message conversation_id
                            const secondToLast = updated[updated.length - 2];
                            if (secondToLast?.role === 'user') {
                                secondToLast.conversation_id = event.data.conversation_id;
                            }
                            return updated;
                        });
                        break;
                    }

                    case 'error': {
                        const errorMessage = event.data.message;
                        setError(errorMessage);
                        onError?.(errorMessage);
                        break;
                    }
                }
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(errorMessage);
            onError?.(errorMessage);

            // Remove the empty assistant message on error
            setMessages(prev => {
                const updated = [...prev];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage.role === 'assistant' && !lastMessage.content) {
                    return updated.slice(0, -1);
                }
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, onArtifact, onError]);

    /**
     * Load an existing conversation by ID
     */
    const loadConversation = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const conversation = await apiClient.conversations.get(id);
            conversationIdRef.current = id;
            setConversationId(id);
            setMessages(conversation.messages);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to load conversation';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [onError]);

    /**
     * Clear the current conversation (for starting a new chat)
     */
    const clearConversation = useCallback(() => {
        conversationIdRef.current = null;
        setConversationId(null);
        setMessages([]);
        setError(null);
    }, []);

    /**
     * Clear the error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        conversationId,
        sendMessage,
        loadConversation,
        clearConversation,
        clearError,
    };
}

export default useChat;
