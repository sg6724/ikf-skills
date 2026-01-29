"use client";

import { X, Download, ExternalLink, FileText, Copy, Check, GripVertical, ChevronDown, FileSpreadsheet, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

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

// Simple markdown to HTML converter
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

// Convert markdown to DOCX
async function convertToDocx(content: string, filename: string) {
    const lines = content.split('\n');
    const children: Paragraph[] = [];

    for (const line of lines) {
        if (line.startsWith('# ')) {
            children.push(
                new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                })
            );
        } else if (line.startsWith('## ')) {
            children.push(
                new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                })
            );
        } else if (line.startsWith('### ')) {
            children.push(
                new Paragraph({
                    text: line.replace('### ', ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 },
                })
            );
        } else if (line.startsWith('- ')) {
            children.push(
                new Paragraph({
                    children: [new TextRun(line.replace('- ', '• '))],
                    indent: { left: 720 },
                })
            );
        } else if (line.match(/^\d+\. /)) {
            children.push(
                new Paragraph({
                    children: [new TextRun(line)],
                    indent: { left: 720 },
                })
            );
        } else if (line === '---') {
            children.push(
                new Paragraph({
                    border: {
                        bottom: { style: 'single' as const, size: 6, color: 'CCCCCC' },
                    },
                    spacing: { before: 200, after: 200 },
                })
            );
        } else if (line.trim()) {
            const runs: TextRun[] = [];
            const parts = line.split(/(\*\*.*?\*\*)/g);
            for (const part of parts) {
                if (part.startsWith('**') && part.endsWith('**')) {
                    runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
                } else if (part) {
                    runs.push(new TextRun(part));
                }
            }
            children.push(new Paragraph({ children: runs }));
        } else {
            children.push(new Paragraph({ text: '' }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const docxFilename = filename.replace('.md', '.docx');
    saveAs(blob, docxFilename);
}

export function PreviewPanel({ artifact, onClose }: PreviewPanelProps) {
    const [copied, setCopied] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [panelWidth, setPanelWidth] = useState(50); // Percentage of remaining space
    const [isResizing, setIsResizing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

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
        if (artifact.content) {
            await navigator.clipboard.writeText(artifact.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleExportDocx = async () => {
        if (artifact.content) {
            setExporting(true);
            try {
                await convertToDocx(artifact.content, artifact.name);
            } catch (error) {
                console.error('Error exporting to DOCX:', error);
            }
            setExporting(false);
        }
    };

    const handleExport = async (format: 'docx' | 'xlsx' | 'pdf') => {
        setShowExportMenu(false);
        if (!artifact.content) return;

        setExporting(true);
        try {
            if (format === 'docx') {
                await convertToDocx(artifact.content, artifact.name);
            } else if (format === 'xlsx') {
                // For now, download as CSV (Excel compatible)
                const blob = new Blob([artifact.content], { type: 'text/csv' });
                saveAs(blob, artifact.name.replace('.md', '.csv'));
            } else if (format === 'pdf') {
                // For now, create a text file (PDF generation requires additional library)
                const blob = new Blob([artifact.content], { type: 'application/pdf' });
                saveAs(blob, artifact.name.replace('.md', '.txt'));
                // Note: Real PDF generation would need jspdf or similar library
            }
        } catch (error) {
            console.error(`Error exporting to ${format}:`, error);
        }
        setExporting(false);
    };

    const handleOpenInDrive = () => {
        window.open('https://docs.google.com/document/create', '_blank');
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
                    {artifact.content ? (
                        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                            <div
                                className="prose prose-invert prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(artifact.content) }}
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
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={exporting || !artifact.content}
                            className="w-full gap-2 justify-between"
                        >
                            <span className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
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
