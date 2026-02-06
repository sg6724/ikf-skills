'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Artifact {
    filename: string;
    type: string;
    url: string;
    size_bytes?: number;
    conversationId: string;
}

interface Conversation {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

interface ConversationContextType {
    // Conversation management
    activeConversationId: string | null;
    setActiveConversation: (id: string | null, options?: { updateUrl?: boolean }) => void;
    conversations: Conversation[];
    refreshConversations: () => Promise<void>;

    // Artifact management (scoped to active conversation)
    selectedArtifact: Artifact | null;
    setSelectedArtifact: (artifact: Artifact | null) => void;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

interface ConversationProviderProps {
    children: ReactNode;
    initialConversationId?: string | null;
}

export function ConversationProvider({ children, initialConversationId }: ConversationProviderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId ?? null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

    const refreshConversations = useCallback(async () => {
        try {
            // Use the Next.js API proxy route instead of direct backend call
            const res = await fetch(`/api/conversations?limit=50&offset=0`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    }, []);

    // Load conversations on mount
    useEffect(() => {
        queueMicrotask(() => {
            void refreshConversations();
        });
    }, [refreshConversations]);

    // Set active conversation with optional URL update
    // NOTE: For new conversations receiving their first ID, we use replaceState
    // to update the URL WITHOUT causing a page navigation. This preserves
    // the streaming state (tool calls, reasoning) in the ChatPage component.
    const setActiveConversation = useCallback((id: string | null, options?: { updateUrl?: boolean }) => {
        const previousId = activeConversationId;
        if (previousId !== id) {
            setSelectedArtifact(null);
        }
        setActiveConversationId(id);

        // Update URL by default when switching conversations
        const shouldUpdateUrl = options?.updateUrl !== false;
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : pathname;

        if (shouldUpdateUrl) {
            if (id) {
                const newPath = `/c/${id}`;
                if (currentPath !== newPath) {
                    // Check if this is a NEW conversation (transitioning from null/undefined)
                    // In this case, use replaceState to avoid page remount
                    if (!previousId && currentPath === '/') {
                        // New conversation just got its ID - shallow update
                        window.history.replaceState(null, '', newPath);
                    } else {
                        // Navigating between existing conversations - full navigation
                        router.push(newPath);
                    }
                }
            } else {
                // Navigate to root for new chat
                if (currentPath !== '/') {
                    router.push('/');
                }
            }
        }
    }, [router, pathname, activeConversationId]);

    const value = useMemo<ConversationContextType>(() => ({
        activeConversationId,
        setActiveConversation,
        conversations,
        refreshConversations,
        selectedArtifact,
        setSelectedArtifact,
    }), [activeConversationId, conversations, refreshConversations, selectedArtifact, setActiveConversation]);

    return (
        <ConversationContext.Provider
            value={value}
        >
            {children}
        </ConversationContext.Provider>
    );
}

export function useConversation() {
    const context = useContext(ConversationContext);
    if (!context) {
        throw new Error('useConversation must be used within a ConversationProvider');
    }
    return context;
}
