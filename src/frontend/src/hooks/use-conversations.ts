'use client';

/**
 * useConversations Hook
 * 
 * React hook for managing the conversations list.
 * Handles fetching, deleting, and refreshing conversations.
 * 
 * All API calls go through the apiClient - no direct database access.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ConversationSummary } from '@/types/api';

interface UseConversationsOptions {
    /** Auto-fetch on mount */
    autoFetch?: boolean;
    /** Callback when an error occurs */
    onError?: (error: string) => void;
}

interface UseConversationsReturn {
    /** List of conversation summaries */
    conversations: ConversationSummary[];
    /** Whether a request is in progress */
    isLoading: boolean;
    /** Current error message, if any */
    error: string | null;
    /** Total number of conversations */
    total: number;
    /** Refresh the conversations list */
    refresh: () => Promise<void>;
    /** Delete a conversation by ID */
    deleteConversation: (id: string) => Promise<boolean>;
    /** Clear error state */
    clearError: () => void;
}

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
    const { autoFetch = true, onError } = options;

    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    /**
     * Fetch conversations from the API
     */
    const fetchConversations = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiClient.conversations.list();
            setConversations(response.conversations);
            setTotal(response.total);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to load conversations';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [onError]);

    /**
     * Delete a conversation by ID
     * Returns true if successful, false otherwise
     */
    const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
        try {
            await apiClient.conversations.delete(id);
            // Optimistically remove from local state
            setConversations(prev => prev.filter(c => c.id !== id));
            setTotal(prev => Math.max(0, prev - 1));
            return true;
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to delete conversation';
            setError(errorMessage);
            onError?.(errorMessage);
            return false;
        }
    }, [onError]);

    /**
     * Clear the error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            fetchConversations();
        }
    }, [autoFetch, fetchConversations]);

    return {
        conversations,
        isLoading,
        error,
        total,
        refresh: fetchConversations,
        deleteConversation,
        clearError,
    };
}

export default useConversations;
