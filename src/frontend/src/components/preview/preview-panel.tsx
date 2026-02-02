"use client";

/**
 * Preview Panel Component
 * 
 * Displays artifact preview and handles export functionality.
 * Uses the apiClient for export - no direct database access or client-side conversion.
 */

import { X, Download, FileText, Copy, Check, GripVertical, ChevronDown, FileSpreadsheet, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import type { ExportFormat } from "@/types/api";

// Backend API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ============================================================================
// Types
// ============================================================================

interface Artifact {
    id: string;
    name: string;
    url: string;
    type: string;
    content?: string;
}

interface PreviewPanelProps {
    artifact: Artifact | null;
    onClose: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple markdown to HTML converter for preview
 */
function renderMarkdown(content: string): string {
    return content
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2 text-foreground">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-5 mb-2 text-foreground">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Horizontal rule
        .replace(/^---$/gim, '<hr class="my-4 border-border" />')
        // Unordered list items
        .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
        // Ordered list items
        .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')
        // Line breaks
        .replace(/\n/g, '<br />');
}

/**
 * Trigger browser download of a blob
 */
function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// Main Component
// ============================================================================

export function PreviewPanel({ artifact, onClose }: PreviewPanelProps) {
    const [copied, setCopied] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [panelWidth, setPanelWidth] = useState(50); // Percentage of remaining space
    const [isResizing, setIsResizing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch content when artifact changes (for markdown/text files)
    useEffect(() => {
        if (!artifact) {
            setContent(null);
            return;
        }

        // If content is already provided, use it
        if (artifact.content) {
            setContent(artifact.content);
            return;
        }

        // For markdown and text files, fetch the content
        const isTextFile = ['md', 'txt', 'markdown'].includes(artifact.type.toLowerCase());
        if (isTextFile && artifact.url) {
            // Build full URL to backend
            const fullUrl = artifact.url.startsWith('http')
                ? artifact.url
                : `${API_BASE_URL}${artifact.url}`;
            setLoading(true);
            fetch(fullUrl)
                .then(res => res.text())
                .then(text => {
                    setContent(text);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch artifact content:', err);
                    setContent(null);
                    setLoading(false);
                });
        } else {
            setContent(null);
        }
    }, [artifact]);

const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
}, []);

useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        // Calculate percentage based on window width (accounting for collapsed sidebar ~64px)
        const availableWidth = window.innerWidth - 64;
        const panelWidthPx = window.innerWidth - e.clientX;
        const percentage = (panelWidthPx / availableWidth) * 100;
        // Clamp between 30% and 70%
        const clampedPercentage = Math.min(Math.max(percentage, 30), 70);
        setPanelWidth(clampedPercentage);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    }

    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };
}, [isResizing]);

if (!artifact) return null;

const handleCopy = async () => {
    if (content) {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
};

/**
 * Export using the backend API
 * The backend handles the conversion - no client-side processing needed
 */
const handleExport = async (format: ExportFormat) => {
    setShowExportMenu(false);
    if (!content) return;

    setExporting(true);
    setExportError(null);

    try {
        // Get the base filename without extension
        const baseFilename = artifact.name.replace(/\.[^/.]+$/, '') || 'export';

        // Call the backend export API
        const blob = await apiClient.export(content, format, baseFilename);

        // Trigger download
        downloadBlob(blob, `${baseFilename}.${format}`);
    } catch (error) {
        console.error(`Error exporting to ${format}:`, error);
        setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
        setExporting(false);
    }
};

return (
    <div
        className="border-l border-border bg-muted/40 flex flex-col h-full shrink-0 transition-all duration-300"
        style={{ width: `${panelWidth}%` }}
    >
        {/* Resize Handle */}
        <div
            onMouseDown={handleMouseDown}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors group z-10"
            style={{ position: 'relative', width: '4px', marginLeft: '-2px' }}
        >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted rounded-r-md -ml-0.5">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
        </div>

        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-muted/60">
            <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate">{artifact.name}</span>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-8 w-8"
                    title="Copy content"
                >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Content - Independently scrollable with grey background */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/20">
            <div className="p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Loader2 className="h-8 w-8 mb-4 animate-spin opacity-50" />
                        <p>Loading preview...</p>
                    </div>
                ) : content ? (
                    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                        <div
                            className="prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-50" />
                        <p>No preview available</p>
                    </div>
                )}
            </div>
        </div>

        {/* Footer with Export */}
        <div className="border-t border-border p-4 shrink-0 bg-muted/60">
            {exportError && (
                <p className="text-xs text-red-400 mb-2 text-center">{exportError}</p>
            )}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={exporting || !content}
                        className="w-full gap-2 justify-between"
                    >
                        <span className="flex items-center gap-2">
                            {exporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {exporting ? 'Exporting...' : 'Export to'}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    {showExportMenu && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                            <button
                                onClick={() => handleExport('docx')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left"
                            >
                                <FileText className="h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="font-medium">Word Document</p>
                                    <p className="text-xs text-muted-foreground">.docx</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleExport('xlsx')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left border-t border-border"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                                <div>
                                    <p className="font-medium">Excel Spreadsheet</p>
                                    <p className="text-xs text-muted-foreground">.xlsx</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left border-t border-border"
                            >
                                <File className="h-4 w-4 text-red-500" />
                                <div>
                                    <p className="font-medium">PDF Document</p>
                                    <p className="text-xs text-muted-foreground">.pdf</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
                Choose a format to download
            </p>
        </div>
    </div>
);
}
