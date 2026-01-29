"use client";

import { useState, useEffect } from "react";
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

  // Auto-collapse sidebar when artifact is selected
  useEffect(() => {
    if (selectedArtifact) {
      setSidebarCollapsed(true);
    }
  }, [selectedArtifact]);

  // Expand sidebar when artifact is closed
  const handleCloseArtifact = () => {
    setSelectedArtifact(null);
    setSidebarCollapsed(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar - controlled collapse state */}
      <Sidebar
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onNewChat={() => {
          setSelectedChatId(null);
          setSelectedArtifact(null);
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area - flex-1 to take available space */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatInterface
          chatId={selectedChatId}
          onSelectArtifact={setSelectedArtifact}
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
