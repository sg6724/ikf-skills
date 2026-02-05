'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
            <Reasoning
                key={`reasoning-${idx}`}
                isStreaming={part.state === 'streaming'}
                defaultOpen={false}
            >
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
                defaultOpen={false}
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
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const previousConversationIdRef = useRef<string | null>(conversationId ?? null);
    const [chatKey, setChatKey] = useState<string>(conversationId ?? 'new');
    const preserveChatKeyRef = useRef(false);
    const conversationIdRef = useRef<string | null>(conversationId ?? null);

    const chat = useMemo(() => {
        return new Chat<UIMessage>({
            id: chatKey,
            messages: [],
            transport: new DefaultChatTransport<UIMessage>({
                api: '/api/chat',
                body: () => ({ conversationId: conversationIdRef.current }),
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
    }, [chatKey]);

    const {
        messages,
        setMessages,
        sendMessage,
        regenerate,
        stop,
        status,
    } = useChat({ chat, experimental_throttle: 0 });

    const isStreaming = status === 'submitted' || status === 'streaming';

    // Reset input when switching conversations (without remounting the page).
    useEffect(() => {
        setInput('');
    }, [conversationId]);

    useEffect(() => {
        conversationIdRef.current = conversationId ?? null;
    }, [conversationId]);

    useEffect(() => {
        const isAssigningNewId =
            previousConversationIdRef.current === null &&
            conversationId &&
            messages.length > 0;

        if (isAssigningNewId) {
            preserveChatKeyRef.current = true;
            return;
        }

        if (preserveChatKeyRef.current && previousConversationIdRef.current === conversationId) {
            return;
        }

        preserveChatKeyRef.current = false;
        setChatKey(conversationId ?? 'new');
    }, [conversationId, messages.length]);

    // Load history (as UIMessage objects) from our Next.js proxy route.
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!conversationId) {
                // If we explicitly switched away from an existing conversation, clear local messages.
                if (previousConversationIdRef.current) {
                    setMessages([]);
                }
                previousConversationIdRef.current = conversationId ?? null;
                setIsHistoryLoading(false);
                return;
            }

            setIsHistoryLoading(true);
            try {
                const res = await fetch(`/api/conversations/${conversationId}`, { cache: 'no-store' });
                if (!res.ok) return;

                const data = await res.json();
                const msgs = Array.isArray(data.messages) ? (data.messages as UIMessage[]) : [];
                if (!cancelled) {
                    setMessages(msgs);
                }
            } finally {
                if (!cancelled) {
                    setIsHistoryLoading(false);
                }
                previousConversationIdRef.current = conversationId ?? null;
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [conversationId, setMessages]);

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
    const lastMessage = messages[messages.length - 1];
    const lastMessageHasRenderableParts =
        lastMessage?.role === 'assistant' &&
        lastMessage.parts.some((p) => {
            if (p.type === 'text') {
                return Boolean((p as any).text);
            }
            if (p.type === 'reasoning') {
                return Boolean((p as any).text);
            }
            if (p.type === 'file' || p.type === 'source-url' || p.type === 'source-document') {
                return true;
            }
            if (p.type === 'dynamic-tool' || p.type.startsWith('tool-')) {
                return true;
            }
            return false;
        });
    const showInlineTypingIndicator = isStreaming && !lastMessageHasRenderableParts;

    // Loading state
    if (isHistoryLoading && !hasMessages) {
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

                    {showInlineTypingIndicator && (
                            <Message from="assistant">
                                <MessageContent>
                                    <TypingIndicator />
                                </MessageContent>
                            </Message>
                        )}
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
