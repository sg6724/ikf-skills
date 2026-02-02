"use client";

/**
 * Home Page
 * 
 * Main application layout with sidebar, chat interface, and preview panel.
 * Coordinates state between components using props (no direct DB access).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { PreviewPanel } from "@/components/preview/preview-panel";

interface Artifact {
  id: string;
  name: string;
  url: string;
  type: string;
  content?: string;
}

export default function Home() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Ref to the sidebar's refresh function
  const sidebarRefreshRef = useRef<(() => void) | null>(null);

  // Auto-collapse sidebar when artifact is selected
  useEffect(() => {
    if (selectedArtifact) {
      setSidebarCollapsed(true);
    }
  }, [selectedArtifact]);

  // Expand sidebar when artifact is closed
  const handleCloseArtifact = useCallback(() => {
    setSelectedArtifact(null);
    setSidebarCollapsed(false);
  }, []);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    setSelectedChatId(null);
    setSelectedArtifact(null);
  }, []);

  // Handle when a new conversation is created from the chat interface
  const handleConversationCreated = useCallback((conversationId: string) => {
    // Update the selected chat ID
    setSelectedChatId(conversationId);
    // Refresh the sidebar's conversation list (without remounting)
    sidebarRefreshRef.current?.();
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar - controlled collapse state */}
      <Sidebar
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onNewChat={handleNewChat}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onRefreshRef={(refresh) => { sidebarRefreshRef.current = refresh; }}
        onSelectArtifact={setSelectedArtifact}
      />

      {/* Main Chat Area - flex-1 to take available space */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatInterface
          chatId={selectedChatId}
          onSelectArtifact={setSelectedArtifact}
          onConversationCreated={handleConversationCreated}
        />
      </main>

      {/* Right Preview Panel - part of flex layout, not overlay */}
      {selectedArtifact && (
        <PreviewPanel
          artifact={selectedArtifact}
          onClose={handleCloseArtifact}
        />
      )}
    </div>
  );
}
