'use client';

import { useEffect, useMemo, useState } from 'react';

import { useChat, type UIMessage, Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
    Message,
    MessageContent,
    MessageActions,
    MessageAction,
    MessageResponse,
} from '@/components/ai-elements/message';
import { TypingIndicator } from '@/components/ai-elements/typing-indicator';
import {
    PromptInput,
    PromptInputBody,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputSubmit,
    type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import {
    Reasoning,
    ReasoningTrigger,
    ReasoningContent,
} from '@/components/ai-elements/reasoning';
import {
    Tool,
    ToolHeader,
    ToolContent as ToolCollapsibleContent,
    ToolInput,
    ToolOutput,
    type ToolPart,
} from '@/components/ai-elements/tool';
import {
    Artifact,
    ArtifactHeader,
    ArtifactTitle,
    ArtifactDescription,
    ArtifactActions,
    ArtifactAction,
    ArtifactContent,
} from '@/components/ai-elements/artifact';
import { WelcomeScreen } from '@/components/welcome-screen';

import { CopyIcon, RefreshCcwIcon, DownloadIcon, PlusIcon, MicIcon } from 'lucide-react';
import {
    PromptInputActions,
    PromptInputButton,
} from '@/components/ai-elements/prompt-input';
import { useConversation } from '@/hooks/use-conversation';

interface ChatPageProps {
    conversationId?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function renderPart(part: UIMessage['parts'][number], idx: number) {
    if (part.type === 'text') {
        // If we have text content, show it
        if (part.text) {
            return <MessageResponse key={`text-${idx}`}>{part.text}</MessageResponse>;
        }
        // If no text yet but part exists (streaming), show typing indicator
        // This handles the case where text-start was received but no text-delta yet
        return null;
    }

    if (part.type === 'reasoning') {
        if (!part.text) return null;
        return (
            <Reasoning key={`reasoning-${idx}`} isStreaming={part.state === 'streaming'}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
        );
    }

    if (part.type === 'file') {
        const filename =
            part.filename ||
            (typeof part.url === 'string' ? decodeURIComponent(part.url.split('/').pop() || 'artifact') : 'artifact');
        const url = part.url.startsWith('http') ? part.url : `${API_URL}${part.url}`;
        return (
            <Artifact key={`file-${idx}`}>
                <ArtifactHeader>
                    <div className="min-w-0">
                        <ArtifactTitle className="truncate">{filename}</ArtifactTitle>
                        <ArtifactDescription className="truncate">{part.mediaType}</ArtifactDescription>
                    </div>
                    <ArtifactActions>
                        <ArtifactAction
                            tooltip="Download"
                            icon={DownloadIcon}
                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        />
                    </ArtifactActions>
                </ArtifactHeader>
                <ArtifactContent>
                    <p className="text-sm text-muted-foreground">
                        This file was created during the run. Use Download to open it.
                    </p>
                </ArtifactContent>
            </Artifact>
        );
    }

    // Tool parts can be static (tool-*) or dynamic-tool
    if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
        const toolPart = part as unknown as ToolPart;
        const isLive = toolPart.state === 'input-streaming' || toolPart.state === 'input-available';

        return (
            <Tool
                key={`tool-${(toolPart as any).toolCallId ?? idx}`}
                defaultOpen={isLive}
            >
                <ToolHeader
                    type={toolPart.type as any}
                    state={toolPart.state as any}
                    {...(toolPart.type === 'dynamic-tool'
                        ? { toolName: (toolPart as any).toolName }
                        : {})}
                />
                <ToolCollapsibleContent>
                    {'input' in (toolPart as any) && <ToolInput input={(toolPart as any).input} />}
                    <ToolOutput
                        output={(toolPart as any).output}
                        errorText={(toolPart as any).errorText}
                    />
                </ToolCollapsibleContent>
            </Tool>
        );
    }

    // Step boundaries and other parts: ignore for now.
    return null;
}

export function ChatPage({ conversationId }: ChatPageProps) {
    const { refreshConversations, setActiveConversation } = useConversation();

    const [input, setInput] = useState('');
    const [seedMessages, setSeedMessages] = useState<UIMessage[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Load history (as UIMessage objects) from our Next.js proxy route.
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!conversationId) {
                setSeedMessages([]);
                return;
            }

            setIsHistoryLoading(true);
            try {
                const res = await fetch(`/api/conversations/${conversationId}`, { cache: 'no-store' });
                if (!res.ok) return;

                const data = await res.json();
                const msgs = Array.isArray(data.messages) ? (data.messages as UIMessage[]) : [];
                if (!cancelled) {
                    setSeedMessages(msgs);
                }
            } finally {
                if (!cancelled) {
                    setIsHistoryLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    // Create a stable key that only changes when we switch conversations
    const chatKey = conversationId ?? 'new';

    const chat = useMemo(() => {
        return new Chat<UIMessage>({
            id: chatKey,
            messages: seedMessages,
            transport: new DefaultChatTransport<UIMessage>({
                api: '/api/chat',
                body: { conversationId: conversationId ?? null },
            }),
            onError: (err) => {
                console.error('chat error:', err);
            },
            onFinish: ({ message }) => {
                // If this was a brand new conversation, the backend sends the server-generated id in message metadata.
                const newConversationId = (message as any)?.metadata?.conversationId as string | undefined;
                if (!conversationId && newConversationId) {
                    setActiveConversation(newConversationId);
                }
                refreshConversations();
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatKey, seedMessages]);

    const {
        messages,
        sendMessage,
        regenerate,
        stop,
        status,
    } = useChat({ chat, experimental_throttle: 0 });

    const isStreaming = status === 'submitted' || status === 'streaming';

    const handleSubmit = (message: PromptInputMessage) => {
        if (!message.text?.trim() || isStreaming) return;
        sendMessage({ text: message.text.trim() });
        setInput('');
    };

    const handleRetry = () => {
        regenerate();
    };

    // Handler for the welcome screen's built-in input
    const handleWelcomeSubmit = () => {
        if (!input.trim() || isStreaming) return;
        sendMessage({ text: input.trim() });
        setInput('');
    };

    const hasMessages = messages.length > 0;

    // Loading state
    if (isHistoryLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <TypingIndicator />
            </div>
        );
    }

    // Empty state - show welcome screen with integrated input
    if (!hasMessages) {
        return (
            <WelcomeScreen
                inputValue={input}
                onInputChange={setInput}
                onSubmit={handleWelcomeSubmit}
                onPromptSelect={(prompt) => setInput(prompt)}
                isDisabled={isStreaming}
            />
        );
    }

    // Conversation state - messages with bottom input
    return (
        <div className="flex flex-col h-full">
            <Conversation className="flex-1 overflow-hidden">
                <ConversationContent>
                    {messages.map((m) => (
                        <Message key={m.id} from={m.role}>
                            <MessageContent>
                                {m.parts.map((part, idx) => renderPart(part, idx))}
                            </MessageContent>

                            {m.role === 'assistant' && !isStreaming && m.parts.some(p => p.type === 'text' && (p as any).text) && (
                                <MessageActions>
                                    <MessageAction onClick={handleRetry} label="Retry">
                                        <RefreshCcwIcon className="size-3" />
                                    </MessageAction>
                                    <MessageAction
                                        onClick={() => {
                                            const text = m.parts
                                                .filter(p => p.type === 'text')
                                                .map(p => (p as any).text as string)
                                                .join('');
                                            navigator.clipboard.writeText(text);
                                        }}
                                        label="Copy"
                                    >
                                        <CopyIcon className="size-3" />
                                    </MessageAction>
                                </MessageActions>
                            )}
                        </Message>
                    ))}

                    {isStreaming && !messages[messages.length - 1]?.parts.some(p =>
                        (p.type === 'reasoning' && p.state === 'streaming') ||
                        (p.type.startsWith('tool-') && (p as any).state?.includes('streaming')) ||
                        (p.type === 'dynamic-tool' && (p as any).state?.includes('streaming'))
                    ) && <TypingIndicator />}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

            {/* Bottom Input - only visible when conversation exists */}
            <div className="px-4 py-4">
                <div className="max-w-3xl mx-auto">
                    <PromptInput onSubmit={handleSubmit}>
                        <PromptInputBody>
                            <PromptInputTextarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask anything"
                                className="text-base"
                            />
                            <PromptInputFooter>
                                {/* Left Actions */}
                                <PromptInputActions>
                                    <PromptInputButton>
                                        <PlusIcon className="size-5" />
                                    </PromptInputButton>
                                </PromptInputActions>

                                {/* Right Actions */}
                                <PromptInputActions>
                                    <PromptInputButton>
                                        <MicIcon className="size-5" />
                                    </PromptInputButton>
                                    <PromptInputSubmit
                                        status={isStreaming ? 'streaming' : 'ready'}
                                        onStop={stop}
                                        disabled={!input.trim() || isStreaming}
                                    />
                                </PromptInputActions>
                            </PromptInputFooter>
                        </PromptInputBody>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}
