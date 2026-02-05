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

    // Clear artifact selection when switching conversations
    useEffect(() => {
        setSelectedArtifact(null);
    }, [activeConversationId]);

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
        refreshConversations();
    }, []);

    // Set active conversation with optional URL update
    const setActiveConversation = useCallback((id: string | null, options?: { updateUrl?: boolean }) => {
        setActiveConversationId(id);

        // Update URL by default when switching conversations
        const shouldUpdateUrl = options?.updateUrl !== false;

        if (shouldUpdateUrl) {
            if (id) {
                // Navigate to /c/{id} for shareable URL
                if (pathname !== `/c/${id}`) {
                    router.push(`/c/${id}`);
                }
            } else {
                // Navigate to root for new chat
                if (pathname !== '/') {
                    router.push('/');
                }
            }
        }
    }, [router, pathname]);

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
