"use client";

import { useState } from "react";
import { Plus, MessageSquare, Archive, ChevronDown, ChevronLeft, ChevronRight, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Chat {
    id: string;
    title: string;
    timestamp: Date;
    preview: string;
}

interface Artefact {
    id: string;
    name: string;
    type: string;
}

interface SidebarProps {
    selectedChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

// Mock data for demonstration
const mockChats: Chat[] = [
    {
        id: "1",
        title: "Social Media Hygiene Report",
        timestamp: new Date(),
        preview: "Generate a comprehensive report…",
    },
    {
        id: "2",
        title: "Resume Analysis",
        timestamp: new Date(Date.now() - 86400000),
        preview: "Analyze the candidate resumes…",
    },
    {
        id: "3",
        title: "Market Research",
        timestamp: new Date(Date.now() - 172800000),
        preview: "Research competitor landscape…",
    },
];

const mockArtefacts: Artefact[] = [
    { id: "a1", name: "Social_Media_Report.md", type: "markdown" },
    { id: "a2", name: "Candidate_Rankings.xlsx", type: "spreadsheet" },
    { id: "a3", name: "Market_Analysis.docx", type: "document" },
];

export function Sidebar({
    selectedChatId,
    onSelectChat,
    onNewChat,
    isCollapsed: controlledCollapsed,
    onToggleCollapse
}: SidebarProps) {
    const [showArtefacts, setShowArtefacts] = useState(true);
    const [showRecentChats, setShowRecentChats] = useState(true);
    const [internalCollapsed, setInternalCollapsed] = useState(false);

    // Use controlled state if provided, otherwise use internal state
    const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
    const handleToggle = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

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
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-72 border-r border-border bg-sidebar flex flex-col h-full shrink-0 transition-all duration-300">
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

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {/* Artefacts Section - Now First */}
                    <div className="mb-4">
                        <button
                            onClick={() => setShowArtefacts(!showArtefacts)}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <Archive className="h-3.5 w-3.5" />
                                Artefacts
                            </span>
                            <ChevronDown
                                className={cn(
                                    "h-3.5 w-3.5 transition-transform",
                                    showArtefacts && "rotate-180"
                                )}
                            />
                        </button>
                        {showArtefacts && (
                            <div className="mt-1 space-y-1">
                                {mockArtefacts.map((artefact) => (
                                    <button
                                        key={artefact.id}
                                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors flex items-center gap-2"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        <span className="truncate">{artefact.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Chats Section */}
                    <div>
                        <button
                            onClick={() => setShowRecentChats(!showRecentChats)}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Recent Chats
                            </span>
                            <ChevronDown
                                className={cn(
                                    "h-3.5 w-3.5 transition-transform",
                                    showRecentChats && "rotate-180"
                                )}
                            />
                        </button>
                        {showRecentChats && (
                            <div className="mt-1 space-y-1">
                                {mockChats.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => onSelectChat(chat.id)}
                                        className={cn(
                                            "w-full text-left px-3 py-2.5 rounded-lg transition-colors group",
                                            "hover:bg-sidebar-accent",
                                            selectedChatId === chat.id
                                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                : "text-sidebar-foreground"
                                        )}
                                    >
                                        <p className="font-medium text-sm truncate">{chat.title}</p>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {chat.preview}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
            </div>
        </aside>
    );
}
