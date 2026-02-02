"use client";

/**
 * Chat Interface Component
 * 
 * Main chat UI that handles sending messages and displaying streaming responses.
 * Uses the useChat hook for API communication - no direct database access.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, ChevronDown } from "lucide-react";
import {
    Conversation,
    ConversationContent,
} from "@/components/ai-elements/conversation";
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputSubmit,
    PromptInputBody,
    PromptInputFooter,
} from "@/components/ai-elements/prompt-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ToolCallDisplay } from "@/components/chat/tool-call-display";
import { ArtifactPreview } from "@/components/artifacts/artifact-preview";
import { useChat } from "@/hooks/use-chat";
import type { ArtifactInfo, ThinkingStep } from "@/types/api";

// ============================================================================
// Types (for component internals)
// ============================================================================

interface ToolCall {
    id: string;
    name: string;
    status: "pending" | "running" | "completed" | "failed";
    duration?: number;
}

interface Artifact {
    id: string;
    name: string;
    url: string;
    type: string;
    content?: string;
}

interface ChatInterfaceProps {
    chatId: string | null;
    onSelectArtifact?: (artifact: Artifact) => void;
    onConversationCreated?: (conversationId: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map API ThinkingStep to component ToolCall format
 */
function mapThinkingStepsToToolCalls(steps?: ThinkingStep[]): ToolCall[] {
    if (!steps) return [];
    return steps
        .filter(step => step.type === 'tool_call' && step.name)
        .map((step, index) => ({
            id: `tc_${index}`,
            name: step.name!,
            status: 'completed' as const,
        }));
}

/**
 * Map API ArtifactInfo to component Artifact format
 */
function mapArtifacts(artifacts?: ArtifactInfo[]): Artifact[] {
    if (!artifacts) return [];
    return artifacts.map((a, index) => ({
        id: `artifact_${index}`,
        name: a.filename,
        url: a.url,
        type: a.type,
    }));
}

// ============================================================================
// Copy Button Component
// ============================================================================

function CopyButton({ text, className }: { text: string; className?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`p-1.5 rounded-md hover:bg-muted/80 transition-colors ${className || ''}`}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
            {copied ? (
                <Check className="w-4 h-4 text-green-500" />
            ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
            )}
        </button>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChatInterface({ chatId, onSelectArtifact, onConversationCreated }: ChatInterfaceProps) {
    const [input, setInput] = useState("");

    // Use the chat hook for API communication
    const {
        messages,
        isLoading,
        error,
        conversationId,
        sendMessage,
        loadConversation,
        clearConversation,
        clearError,
    } = useChat({
        onError: (err) => console.error('Chat error:', err),
    });

    // Track whether we're loading an existing conversation (to avoid triggering onConversationCreated)
    const isLoadingExistingRef = useRef(false);

    // Load conversation when chatId changes
    useEffect(() => {
        if (chatId === null) {
            clearConversation();
        } else if (chatId !== conversationId) {
            isLoadingExistingRef.current = true;
            loadConversation(chatId).finally(() => {
                isLoadingExistingRef.current = false;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId]); // Only depend on chatId to avoid loops

    // Notify parent when a NEW conversation is created (not when loading existing)
    useEffect(() => {
        if (conversationId && conversationId !== chatId && !isLoadingExistingRef.current) {
            onConversationCreated?.(conversationId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]); // Only depend on conversationId

    // Auto-select new artifacts
    const lastArtifactRef = useRef<string | null>(null);

    useEffect(() => {
        if (!messages.length) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== 'assistant' || !lastMessage.artifacts?.length) return;

        // Get the latest artifact
        const artifacts = mapArtifacts(lastMessage.artifacts);
        const latestArtifact = artifacts[artifacts.length - 1];

        // If it's a new artifact (by URL comparisons since IDs are unstable)
        if (latestArtifact.url !== lastArtifactRef.current) {
            lastArtifactRef.current = latestArtifact.url;
            onSelectArtifact?.(latestArtifact);
        }
    }, [messages, onSelectArtifact]);

    const handleSubmit = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const messageContent = input;
        setInput("");
        await sendMessage(messageContent);
    }, [input, isLoading, sendMessage]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
                <h2 className="font-display font-semibold text-sm">IKF AI Agent</h2>
                {error && (
                    <button
                        onClick={clearError}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                        {error} (click to dismiss)
                    </button>
                )}
            </header>

            {/* Chat Content */}
            <Conversation className="flex-1 min-h-0">
                <ConversationContent className="p-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
                            <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center mb-6">
                                <span className="text-background font-serif text-2xl">𝐢</span>
                            </div>
                            <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                            <p className="text-muted-foreground text-sm mb-8">Choose a suggestion or type your own request</p>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={() => setInput("Generate a social media hygiene report for @techcompany")}
                                    className="text-left p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                                >
                                    <p className="font-medium text-sm">Social Media Analysis</p>
                                    <p className="text-xs text-muted-foreground mt-1">Generate hygiene report for a profile</p>
                                </button>
                                <button
                                    onClick={() => setInput("Analyze candidate resumes and rank them")}
                                    className="text-left p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                                >
                                    <p className="font-medium text-sm">Resume Screening</p>
                                    <p className="text-xs text-muted-foreground mt-1">Analyze and rank candidate resumes</p>
                                </button>
                                <button
                                    onClick={() => setInput("Research competitor landscape for my industry")}
                                    className="text-left p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                                >
                                    <p className="font-medium text-sm">Market Research</p>
                                    <p className="text-xs text-muted-foreground mt-1">Research competitor landscape</p>
                                </button>
                                <button
                                    onClick={() => setInput("Create a project proposal document")}
                                    className="text-left p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                                >
                                    <p className="font-medium text-sm">Document Generation</p>
                                    <p className="text-xs text-muted-foreground mt-1">Create proposals and reports</p>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-5xl mx-auto">
                            {messages.map((message) => {
                                const toolCalls = mapThinkingStepsToToolCalls(message.thinking_steps);
                                const artifacts = mapArtifacts(message.artifacts);
                                // Deduplicate tool calls by name
                                const uniqueToolCalls = toolCalls.filter(
                                    (tool, index, self) => index === self.findIndex(t => t.name === tool.name)
                                );

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {/* Collapsible Tools Section - Outside message box, only for technical users */}
                                        {message.role === "assistant" && uniqueToolCalls.length > 0 && (
                                            <details className="mb-2 text-xs">
                                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                                                    <ChevronDown className="w-3 h-3" />
                                                    <span>Tools called ({uniqueToolCalls.length})</span>
                                                </summary>
                                                <div className="mt-2 ml-4 space-y-1 text-muted-foreground">
                                                    {uniqueToolCalls.map((tool) => (
                                                        <div key={tool.id} className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            <span>{tool.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}

                                        {/* Message Box - No avatars */}
                                        <div
                                            className={`group relative rounded-2xl px-5 py-4 ${message.role === "user"
                                                ? "bg-primary/10 text-foreground"
                                                : "bg-muted/30 border border-border/40"
                                                }`}
                                            style={{ maxWidth: "85%" }}
                                        >
                                            {/* Copy Button - Shows on hover, only copies message content */}
                                            {message.content && (
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <CopyButton
                                                        text={message.content}
                                                        className="bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm"
                                                    />
                                                </div>
                                            )}

                                            {/* Message Content with proper markdown sizing */}
                                            {message.role === "assistant" ? (
                                                <div className="prose prose-invert max-w-none
                                                    [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                                                    
                                                    prose-h1:text-2xl prose-h1:font-bold prose-h1:text-foreground prose-h1:mt-8 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-border/30
                                                    prose-h2:text-xl prose-h2:font-semibold prose-h2:text-foreground prose-h2:mt-6 prose-h2:mb-3
                                                    prose-h3:text-lg prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-5 prose-h3:mb-2
                                                    prose-h4:text-base prose-h4:font-medium prose-h4:text-foreground prose-h4:mt-4 prose-h4:mb-2
                                                    
                                                    prose-p:text-base prose-p:text-foreground/90 prose-p:leading-7 prose-p:my-3
                                                    
                                                    prose-ul:my-3 prose-ul:pl-6 prose-ul:list-disc
                                                    prose-ol:my-3 prose-ol:pl-6 prose-ol:list-decimal
                                                    prose-li:text-foreground/90 prose-li:my-1.5 prose-li:leading-7
                                                    
                                                    prose-strong:text-foreground prose-strong:font-semibold
                                                    prose-em:text-foreground/80 prose-em:italic
                                                    
                                                    prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                                                    prose-pre:bg-muted prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-4 prose-pre:overflow-x-auto
                                                    
                                                    prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-4
                                                    
                                                    prose-hr:border-border/50 prose-hr:my-6
                                                    prose-a:text-primary prose-a:underline prose-a:underline-offset-2
                                                ">
                                                    {message.content ? (
                                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">Generating response...</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[15px] leading-relaxed">
                                                    {message.content}
                                                </p>
                                            )}

                                            {/* Artifacts - Still inside box */}
                                            {artifacts.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                                                    {artifacts.map((artifact) => (
                                                        <div
                                                            key={artifact.id}
                                                            onClick={() => onSelectArtifact?.(artifact)}
                                                            className="cursor-pointer"
                                                        >
                                                            <ArtifactPreview artifact={artifact} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Loading indicator - No avatar */}
                            {isLoading && (
                                <div className="flex justify-start w-full">
                                    <div className="bg-muted/30 border border-border/40 rounded-2xl px-5 py-4">
                                        <TypingIndicator />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ConversationContent>
            </Conversation>

            {/* Input Area */}
            <div className="border-t border-border p-4 shrink-0">
                <div className="max-w-5xl mx-auto">
                    <PromptInput
                        onSubmit={() => handleSubmit()}
                        className="bg-input rounded-xl border border-border"
                    >
                        <PromptInputBody>
                            <PromptInputTextarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask the Meta Agent to perform a task…"
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                className="min-h-[52px] resize-none"
                            />
                        </PromptInputBody>
                        <PromptInputFooter className="justify-end p-2">
                            <PromptInputSubmit disabled={isLoading || !input.trim()} />
                        </PromptInputFooter>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}
