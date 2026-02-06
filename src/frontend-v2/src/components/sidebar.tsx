'use client';

import * as React from 'react';
import { useConversation } from '@/hooks/use-conversation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusIcon, MessageSquareIcon, TrashIcon, PanelLeft, SquarePen, Sparkles, Hand, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsModal } from '@/components/settings-modal';

interface SidebarProps {
    isExpanded: boolean;
    onToggle: () => void;
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
    const {
        conversations,
        activeConversationId,
        setActiveConversation,
        refreshConversations,
    } = useConversation();

    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    const handleNewChat = () => {
        setActiveConversation(null);
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // Use the Next.js API route proxy instead of direct backend call
            const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete conversation: ${response.status} ${errorText}`);
            }
            if (activeConversationId === id) {
                setActiveConversation(null);
            }
            refreshConversations();
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 bg-sidebar">
            {/* Top Bar: Logo & Toggle */}
            <div className={cn(
                "flex px-4 py-4 min-h-[64px] transition-all duration-300",
                isExpanded ? "flex-row items-center justify-between" : "flex-col items-center"
            )}>
                {isExpanded ? (
                    <>
                        <div className="flex items-center gap-2.5">
                            <div className="size-8 shrink-0 flex items-center justify-center bg-foreground text-background rounded-lg font-bold text-lg select-none">
                                i
                            </div>
                            <span className="text-base font-semibold tracking-tight text-foreground whitespace-nowrap">
                                IKF AI Playground
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggle}
                            className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 size-8"
                        >
                            <PanelLeft className="size-5" />
                        </Button>
                    </>
                ) : (
                    <div className="relative group size-10 flex items-center justify-center">
                        {/* Logo Icon - Visible by default */}
                        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0">
                            <div className="size-8 shrink-0 flex items-center justify-center bg-foreground text-background rounded-lg font-bold text-lg select-none">
                                i
                            </div>
                        </div>
                        {/* Toggle Button - Visible on Hover */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggle}
                            className="absolute inset-0 size-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg"
                        >
                            <PanelLeft className="size-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Navigation Items */}
            <div className="px-3 mt-4 space-y-1">
                <Button
                    onClick={handleNewChat}
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3 px-3 h-10 transition-colors hover:bg-foreground/5",
                        !isExpanded && "justify-center px-0",
                        activeConversationId === null && "bg-foreground/5"
                    )}
                >
                    <SquarePen className="size-4 shrink-0" />
                    {isExpanded && <span className="font-normal text-[14px]">New task</span>}
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3 px-3 h-10 transition-colors hover:bg-foreground/5",
                        !isExpanded && "justify-center px-0"
                    )}
                >
                    <Sparkles className="size-4 shrink-0" />
                    {isExpanded && <span className="font-normal text-[14px]">Artifacts</span>}
                </Button>
            </div>

            {isExpanded && (
                <div className="px-6 pt-8 pb-2">
                    <h2 className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-wider">
                        Previous Tasks
                    </h2>
                </div>
            )}

            <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 py-2 space-y-0.5">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            onClick={() => setActiveConversation(conversation.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveConversation(conversation.id);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-current={activeConversationId === conversation.id ? 'page' : undefined}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 group relative',
                                'hover:bg-foreground/[0.03] active:bg-foreground/[0.05]',
                                activeConversationId === conversation.id && 'bg-foreground/[0.05] font-medium text-foreground',
                                !isExpanded && "hidden" // Hide chats in rail state as per screenshot style
                            )}
                        >
                            {isExpanded && (
                                <>
                                    <span className="flex-1 truncate min-w-0 pr-6">
                                        {conversation.title || 'New Chat'}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1.5 hover:bg-foreground/10"
                                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                    >
                                        <TrashIcon className="size-3.5" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))}

                    {isExpanded && conversations.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground italic">
                            No conversations yet
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 mt-auto">
                <Button
                    variant="ghost"
                    onClick={() => setIsSettingsOpen(true)}
                    className={cn(
                        "w-full justify-start gap-3 px-3 h-10 transition-colors hover:bg-foreground/5",
                        !isExpanded && "justify-center px-0"
                    )}
                >
                    <Settings className="size-4 shrink-0" />
                    {isExpanded && <span className="font-normal text-[14px]">Settings</span>}
                </Button>
            </div>

            <SettingsModal
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            />
        </div>
    );
}
