'use client';

import { useParams } from 'next/navigation';
import { ConversationProvider } from '@/hooks/use-conversation';
import { ChatLayout } from '@/components/chat-layout';

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.id as string;

    return (
        <ConversationProvider initialConversationId={conversationId}>
            <ChatLayout />
        </ConversationProvider>
    );
}

