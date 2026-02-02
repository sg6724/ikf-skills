"use client";

/**
 * Sidebar Component
 * 
 * Displays conversation history and artifacts.
 * Uses the useConversations hook for API communication - no direct database access.
 */

import { useState, useEffect } from "react";
import { Plus, MessageSquare, Archive, ChevronDown, ChevronLeft, ChevronRight, Settings, FileText, Trash2, Loader2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/use-conversations";
import { SettingsDialog } from "@/components/layout/settings-dialog";
import type { ConversationSummary } from "@/types/api";

// ============================================================================
// Types
// ============================================================================

interface Artifact {
    id: string;
    filename: string;
    type: string;
    url: string;
    size_bytes?: number;
}

interface SidebarProps {
    selectedChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    onRefreshRef?: (refresh: () => void) => void;
    onSelectArtifact?: (artifact: { id: string; name: string; url: string; type: string }) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

// ============================================================================
// Main Component
// ============================================================================

export function Sidebar({
    selectedChatId,
    onSelectChat,
    onNewChat,
    isCollapsed: controlledCollapsed,
    onToggleCollapse,
    onRefreshRef,
    onSelectArtifact
}: SidebarProps) {
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [showRecentChats, setShowRecentChats] = useState(true);
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [loadingArtifacts, setLoadingArtifacts] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Use controlled state if provided, otherwise use internal state
    const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
    const handleToggle = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

    // Fetch conversations from API
    const {
        conversations,
        isLoading,
        error,
        deleteConversation,
        refresh,
    } = useConversations();

    // Expose refresh function to parent via ref callback
    useEffect(() => {
        onRefreshRef?.(refresh);
    }, [onRefreshRef, refresh]);

    // Fetch ALL artifacts globally (not just selected conversation)
    useEffect(() => {
        const fetchArtifacts = async () => {
            setLoadingArtifacts(true);
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const response = await fetch(`${API_BASE_URL}/api/artifacts`);
                if (response.ok) {
                    const data = await response.json();
                    setArtifacts(data.artifacts || []);
                } else {
                    setArtifacts([]);
                }
            } catch (err) {
                console.error('Failed to fetch artifacts:', err);
                setArtifacts([]);
            } finally {
                setLoadingArtifacts(false);
            }
        };

        fetchArtifacts();
    }, []); // Fetch once on mount

    // Handle delete with confirmation
    const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation(); // Prevent selecting the conversation

        if (!confirm('Delete this conversation? This cannot be undone.')) {
            return;
        }

        setDeletingId(conversationId);
        const success = await deleteConversation(conversationId);
        setDeletingId(null);

        if (success && selectedChatId === conversationId) {
            onNewChat(); // Start a new chat if we deleted the selected one
        }
    };

    // Collapsed view
    if (isCollapsed) {
        return (
            <aside className="w-16 border-r border-border bg-sidebar flex flex-col h-full items-center py-4 shrink-0 transition-all duration-300">
                {/* Logo */}
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center mb-4">
                    <span className="text-background font-serif text-lg">𝐢</span>
                </div>

                {/* Expand Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggle}
                    className="mb-4"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {/* New Chat */}
                <Button
                    onClick={onNewChat}
                    size="icon"
                    className="bg-primary hover:bg-primary/90 mb-4"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                {/* Settings at bottom */}
                <div className="mt-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        onClick={() => setShowSettings(true)}
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-72 border-r border-border bg-sidebar flex flex-col h-full shrink-0 transition-all duration-300 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
                        <span className="text-background font-serif text-lg">𝐢</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggle}
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>

                {/* New Chat Button */}
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2 bg-primary hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            {/* Content Area - Split 50/50 between Artifacts and Chats */}
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Artifacts Section - Takes 50% when open */}
                <div className={cn("min-h-0 flex flex-col border-b border-border transition-all duration-300", showArtifacts ? "flex-1" : "flex-none")}>
                    <button
                        onClick={() => setShowArtifacts(!showArtifacts)}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors shrink-0"
                    >
                        <span className="flex items-center gap-2">
                            <Archive className="h-3.5 w-3.5" />
                            Artifacts ({artifacts.length})
                            {loadingArtifacts && <Loader2 className="h-3 w-3 animate-spin" />}
                        </span>
                        <ChevronDown
                            className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                showArtifacts && "rotate-180"
                            )}
                        />
                    </button>
                    {showArtifacts && (
                        <div className="flex-1 overflow-y-auto px-2 pb-2">
                            {artifacts.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-muted-foreground italic">
                                    No artifacts generated yet
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {artifacts.map((artifact, index) => (
                                        <button
                                            key={`${artifact.filename}-${index}`}
                                            onClick={() => onSelectArtifact?.({
                                                id: artifact.filename,
                                                name: artifact.filename,
                                                url: artifact.url,
                                                type: artifact.type
                                            })}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-sidebar-accent transition-colors"
                                        >
                                            <File className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm truncate">{artifact.filename}</p>
                                                <p className="text-xs text-muted-foreground">{artifact.type.toUpperCase()}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Chats Section - Takes remaining space */}
                <div className={cn("min-h-0 flex flex-col transition-all duration-300", showRecentChats ? "flex-1" : "flex-none")}>

                    <button
                        onClick={() => setShowRecentChats(!showRecentChats)}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors shrink-0"
                    >
                        <span className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Recent Chats ({conversations.length})
                            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        </span>
                        <ChevronDown
                            className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                showRecentChats && "rotate-180"
                            )}
                        />
                    </button>
                    {showRecentChats && (
                        <div className="flex-1 overflow-y-auto px-2 pb-2 mt-1 space-y-1">
                            {error ? (
                                <div className="px-3 py-2">
                                    <p className="text-xs text-red-400">{error}</p>
                                    <button
                                        onClick={refresh}
                                        className="text-xs text-primary hover:underline mt-1"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : conversations.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-muted-foreground italic">
                                    {isLoading ? 'Loading...' : 'No conversations yet'}
                                </p>
                            ) : (
                                conversations.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className={cn(
                                            "group relative w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                                            "hover:bg-sidebar-accent",
                                            selectedChatId === chat.id
                                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                : "text-sidebar-foreground"
                                        )}
                                    >
                                        <button
                                            onClick={() => onSelectChat(chat.id)}
                                            className="w-full text-left"
                                        >
                                            <p className="font-medium text-sm truncate pr-6">{chat.title}</p>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {chat.preview || 'No messages'}
                                            </p>
                                        </button>

                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => handleDelete(e, chat.id)}
                                            disabled={deletingId === chat.id}
                                            className={cn(
                                                "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded",
                                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                                "hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                                            )}
                                            title="Delete conversation"
                                        >
                                            {deletingId === chat.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => setShowSettings(true)}
                >
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
            </div>

            <SettingsDialog
                open={showSettings}
                onOpenChange={setShowSettings}
            />
        </aside>
    );
}
