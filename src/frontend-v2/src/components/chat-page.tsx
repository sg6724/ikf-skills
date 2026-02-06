'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
    type ToolPart,
} from '@/components/ai-elements/tool';
import {
    ChainOfThought,
    ChainOfThoughtContent,
    ChainOfThoughtHeader,
    ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
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

import { CopyIcon, RefreshCcwIcon, DownloadIcon, PlusIcon, MicIcon, WrenchIcon } from 'lucide-react';
import {
    PromptInputActions,
    PromptInputButton,
} from '@/components/ai-elements/prompt-input';
import { useConversation } from '@/hooks/use-conversation';

interface ChatPageProps {
    conversationId?: string | null;
}

type RenderToolPart = ToolPart & {
    toolCallId?: string;
    toolName?: string;
    input?: ToolPart['input'];
    output?: ToolPart['output'];
    errorText?: ToolPart['errorText'];
};

function getToolName(part: ToolPart): string {
    if (part.type === 'dynamic-tool') {
        return (part as RenderToolPart).toolName || 'tool';
    }

    return part.type.split('-').slice(1).join('-') || 'tool';
}

function toSameOriginPath(rawUrl: string): string | null {
    if (rawUrl.startsWith('/')) return rawUrl;
    if (rawUrl.startsWith('api/')) return `/${rawUrl}`;
    if (!rawUrl.startsWith('http')) return null;

    try {
        const parsed = new URL(rawUrl);
        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return null;
    }
}

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
        if (typeof part.url !== 'string' || part.url.length === 0) {
            return null;
        }
        const filename =
            part.filename ||
            (typeof part.url === 'string' ? decodeURIComponent(part.url.split('/').pop() || 'artifact') : 'artifact');
        const url = toSameOriginPath(part.url);
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
                            onClick={() => {
                                if (!url) return;
                                window.open(url, '_blank', 'noopener,noreferrer');
                            }}
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

    // Step boundaries and other parts: ignore for now.
    return null;
}

function isToolPart(part: UIMessage['parts'][number]): part is RenderToolPart {
    return part.type === 'dynamic-tool' || part.type.startsWith('tool-');
}

function orderMessageParts(parts: UIMessage['parts']) {
    const nonFileParts: UIMessage['parts'] = [];
    const fileParts: UIMessage['parts'] = [];
    const toolParts: RenderToolPart[] = [];

    for (const part of parts) {
        if (isToolPart(part)) {
            toolParts.push(part);
            continue;
        }
        if (part.type === 'file') {
            fileParts.push(part);
            continue;
        }
        nonFileParts.push(part);
    }

    return {
        nonFileParts,
        fileParts,
        toolParts,
    };
}

function mapToolStateToStepStatus(
    state: RenderToolPart['state'],
): 'complete' | 'active' | 'pending' {
    if (state === 'output-available' || state === 'output-error' || state === 'output-denied') {
        return 'complete';
    }
    if (state === 'input-streaming') {
        return 'pending';
    }
    return 'active';
}

function formatToolState(state: RenderToolPart['state']): string {
    switch (state) {
        case 'input-streaming':
            return 'Preparing call';
        case 'input-available':
            return 'Running';
        case 'approval-requested':
            return 'Awaiting approval';
        case 'approval-responded':
            return 'Approved';
        case 'output-available':
            return 'Completed';
        case 'output-error':
            return 'Completed with error';
        case 'output-denied':
            return 'Denied';
        default:
            return 'In progress';
    }
}

function toolStateClassName(state: RenderToolPart['state']): string {
    switch (state) {
        case 'output-available':
            return 'text-emerald-600';
        case 'output-error':
            return 'text-red-600';
        case 'output-denied':
            return 'text-amber-600';
        case 'approval-requested':
            return 'text-amber-600';
        case 'input-available':
            return 'text-foreground';
        default:
            return 'text-muted-foreground';
    }
}

function renderWorkTrace(
    toolParts: RenderToolPart[],
    showThinking: boolean,
): ReactNode {
    if (!showThinking && toolParts.length === 0) return null;

    return (
        <ChainOfThought
            key="work-trace"
            defaultOpen
            className="mb-3 max-w-none"
        >
            <ChainOfThoughtHeader className="[&>span]:flex-none [&>svg:last-child]:ml-1">
                Thinking
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent className="ml-6 space-y-1">
                {toolParts.map((toolPart, idx) => (
                    <ChainOfThoughtStep
                        key={`tool-step-${toolPart.toolCallId ?? idx}`}
                        icon={WrenchIcon}
                        label={
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-foreground/90">{getToolName(toolPart)}</span>
                                <span className={`text-xs ${toolStateClassName(toolPart.state)}`}>
                                    {formatToolState(toolPart.state)}
                                </span>
                            </div>
                        }
                        status={mapToolStateToStepStatus(toolPart.state)}
                        className="pl-0 [&>div:first-child>div]:hidden"
                    />
                ))}
            </ChainOfThoughtContent>
        </ChainOfThought>
    );
}

function renderMessageParts(
    parts: UIMessage['parts'],
    options: { showThinking: boolean },
): ReactNode[] {
    const { nonFileParts, fileParts, toolParts } = orderMessageParts(parts);

    const rendered: ReactNode[] = [];

    const workTrace = renderWorkTrace(toolParts, options.showThinking);
    if (workTrace) rendered.push(workTrace);

    nonFileParts.forEach((part, idx) => {
        const el = renderPart(part, idx);
        if (el) rendered.push(el);
    });

    fileParts.forEach((part, idx) => {
        const el = renderPart(part, nonFileParts.length + idx);
        if (el) rendered.push(el);
    });

    return rendered;
}

export function ChatPage({ conversationId }: ChatPageProps) {
    const { refreshConversations, setActiveConversation } = useConversation();

    const [input, setInput] = useState('');
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const previousConversationIdRef = useRef<string | null>(conversationId ?? null);
    const [chatKey, setChatKey] = useState<string>(conversationId ?? 'new');
    const preserveChatKeyRef = useRef(false);
    const conversationIdRef = useRef<string | null>(conversationId ?? null);
    const setActiveConversationRef = useRef(setActiveConversation);
    const refreshConversationsRef = useRef(refreshConversations);

    useEffect(() => {
        setActiveConversationRef.current = setActiveConversation;
    }, [setActiveConversation]);

    useEffect(() => {
        refreshConversationsRef.current = refreshConversations;
    }, [refreshConversations]);

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
                const resolvedConversationId = (message as any)?.metadata?.conversationId as string | undefined;

                // Latch the server conversation id immediately so the next send reuses it.
                if (resolvedConversationId) {
                    conversationIdRef.current = resolvedConversationId;
                }

                // Keep conversation context in sync without relying on stale closures.
                if (
                    resolvedConversationId &&
                    previousConversationIdRef.current !== resolvedConversationId
                ) {
                    setActiveConversationRef.current(resolvedConversationId);
                }
                refreshConversationsRef.current();
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

    // Synchronously update refs BEFORE other effects run.
    // This fixes the race condition where other effects might read stale values.
    // useLayoutEffect runs synchronously after DOM mutations but before paint,
    // ensuring refs are updated before useEffect callbacks execute.
    useLayoutEffect(() => {
        conversationIdRef.current = conversationId ?? null;
    }, [conversationId]);

    // Chat key management - controls when to reset the Chat instance
    // 
    // CRITICAL: When a new conversation gets its first ID from the backend,
    // we must NOT reset the chatKey. Resetting would recreate the Chat instance,
    // which would lose all streaming state (tool calls, reasoning, etc.)
    //
    // The key insight: if chatKey is 'new' and we already have messages,
    // then we're in a new conversation that just got its ID - preserve it!
    useLayoutEffect(() => {
        const previousConversationId = previousConversationIdRef.current;

        // Check if this is a new conversation that just received its ID
        const isNewChatReceivingId =
            chatKey === 'new' &&
            conversationId &&
            messages.length > 0 &&
            !previousConversationId;

        if (isNewChatReceivingId) {
            // Don't change chatKey - keep the current Chat instance alive
            // The streaming messages, tool calls, and reasoning are preserved
            preserveChatKeyRef.current = true;
            // Record the assigned id so future navigation can clear preservation correctly.
            previousConversationIdRef.current = conversationId;
            return;
        }

        // If we were preserving but now switching to a different conversation
        if (preserveChatKeyRef.current && conversationId !== previousConversationId) {
            // User navigated away, reset the flag
            preserveChatKeyRef.current = false;
        }

        // Only change chatKey if we're not preserving
        if (!preserveChatKeyRef.current) {
            const newKey = conversationId ?? 'new';
            if (newKey !== chatKey) {
                setChatKey(newKey);
            }
        }

        previousConversationIdRef.current = conversationId ?? null;
    }, [conversationId, messages.length, chatKey]);

    // Load history (as UIMessage objects) from our Next.js API proxy route.
    // IMPORTANT: Skip loading when we're preserving an active streaming session
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            // Case 1: No conversation ID = new chat, clear messages
            if (!conversationId) {
                setMessages([]);
                setIsHistoryLoading(false);
                return;
            }

            // Case 2: Preserving current chat (new chat just got its ID)
            // DO NOT load history - it would overwrite our streaming messages
            // which contain tool calls and reasoning that aren't in the database
            if (preserveChatKeyRef.current) {
                setIsHistoryLoading(false);
                return;
            }

            // Case 3: Navigating to an existing conversation - load its history
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
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [conversationId, chatKey, setMessages]);

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
    const showInlineThinkingTrace =
        isStreaming &&
        !lastMessageHasRenderableParts &&
        lastMessage?.role !== 'assistant';

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
                    {messages.map((m, messageIndex) => (
                        <Message key={m.id} from={m.role}>
                            <MessageContent>
                                {renderMessageParts(m.parts, {
                                    showThinking:
                                        m.role === 'assistant' &&
                                        messageIndex === messages.length - 1 &&
                                        isStreaming,
                                })}
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

                    {showInlineThinkingTrace && (
                        <Message from="assistant">
                            <MessageContent>
                                {renderWorkTrace([], true)}
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
