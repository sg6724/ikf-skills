'use client';

import { ConversationProvider } from '@/hooks/use-conversation';
import { ChatLayout } from '@/components/chat-layout';

export default function Home() {
    return (
        <ConversationProvider>
            <ChatLayout />
        </ConversationProvider>
    );
}

