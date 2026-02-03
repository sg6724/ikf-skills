'use client';

import { useCallback, useEffect, useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConversationProvider, useConversation } from '@/hooks/use-conversation';
import { ChatPage } from '@/components/chat-page';
import { Sidebar } from '@/components/sidebar';
import { ArtifactPanel } from '@/components/artifact-panel';

function MainLayout() {
  const { activeConversationId, selectedArtifact } = useConversation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 200 && newWidth < 480) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar Container */}
      <div
        className={cn(
          "relative h-full shrink-0 border-r bg-sidebar",
          !isResizing && "transition-[width] duration-300 ease-in-out"
        )}
        style={{ width: isSidebarOpen ? sidebarWidth : 68 }}
      >
        <Sidebar
          isExpanded={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Resizer Handle */}
        {isSidebarOpen && (
          <div
            onMouseDown={startResizing}
            className={cn(
              "absolute top-0 right-[-4px] w-2 h-full cursor-col-resize z-50 group hover:bg-primary/20 transition-colors",
              isResizing && "bg-primary/30"
            )}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-8 bg-border group-hover:bg-primary/50 rounded-full" />
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatPage key={activeConversationId || 'new'} conversationId={activeConversationId} />
      </div>

      {/* Artifact Panel - only show when artifact is selected */}
      {selectedArtifact && (
        <div className="w-96 shrink-0 border-l bg-background">
          <ArtifactPanel />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ConversationProvider>
      <MainLayout />
    </ConversationProvider>
  );
}
