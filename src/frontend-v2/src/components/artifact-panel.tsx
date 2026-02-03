'use client';

import { useConversation } from '@/hooks/use-conversation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    FileTextIcon,
    DownloadIcon,
    XIcon,
    FileIcon,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export function ArtifactPanel() {
    const { selectedArtifact, setSelectedArtifact, activeConversationId } = useConversation();

    if (!selectedArtifact) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30">
                <FileTextIcon className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">Select an artifact to preview</p>
            </div>
        );
    }

    const extension = selectedArtifact.filename.split('.').pop()?.toLowerCase();
    const isMarkdown = extension === 'md';
    const isPreviewable = isMarkdown; // Add more formats as needed

    const downloadUrl = `${API_URL}/api/artifacts/${activeConversationId}/${encodeURIComponent(selectedArtifact.filename)}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = selectedArtifact.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="size-4 shrink-0" />
                    <span className="truncate text-sm font-medium">
                        {selectedArtifact.filename}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <DownloadIcon className="size-4 mr-1" />
                        Download
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedArtifact(null)}
                    >
                        <XIcon className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                {isPreviewable ? (
                    <div className="p-4">
                        <MarkdownPreview url={downloadUrl} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <FileIcon className="w-16 h-16 mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">{selectedArtifact.filename}</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Preview not available for .{extension} files
                        </p>
                        <Button onClick={handleDownload}>
                            <DownloadIcon className="size-4 mr-2" />
                            Download File
                        </Button>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

// Simple markdown preview component
function MarkdownPreview({ url }: { url: string }) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useState(() => {
        fetch(url)
            .then((res) => res.text())
            .then(setContent)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    });

    if (loading) {
        return <div className="text-muted-foreground">Loading...</div>;
    }

    if (error) {
        return <div className="text-destructive">Error: {error}</div>;
    }

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans">{content}</pre>
        </div>
    );
}

import { useState } from 'react';
