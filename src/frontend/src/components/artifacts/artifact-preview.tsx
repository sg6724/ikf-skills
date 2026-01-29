"use client";

import { FileText, FileSpreadsheet, File, FileCode, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Artifact {
    id: string;
    name: string;
    url: string;
    type: string;
    content?: string;
}

interface ArtifactPreviewProps {
    artifact: Artifact;
}

function getFileIcon(type: string, name: string) {
    const extension = name.split(".").pop()?.toLowerCase();

    if (extension === "md" || type.includes("markdown")) {
        return FileCode;
    }
    if (extension === "docx" || extension === "doc" || type.includes("word")) {
        return FileText;
    }
    if (extension === "xlsx" || extension === "xls" || extension === "csv" || type.includes("spreadsheet")) {
        return FileSpreadsheet;
    }
    return File;
}

function getFileTypeLabel(name: string): string {
    const extension = name.split(".").pop()?.toLowerCase();

    switch (extension) {
        case "md":
            return "Markdown Document";
        case "docx":
        case "doc":
            return "Word Document";
        case "xlsx":
        case "xls":
            return "Excel Spreadsheet";
        case "csv":
            return "CSV File";
        case "pdf":
            return "PDF Document";
        default:
            return "File";
    }
}

export function ArtifactPreview({ artifact }: ArtifactPreviewProps) {
    const FileIcon = getFileIcon(artifact.type, artifact.name);
    const fileTypeLabel = getFileTypeLabel(artifact.name);

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
                "bg-card/50 border-border",
                "hover:bg-card hover:border-primary/30"
            )}
        >
            {/* File Icon */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileIcon className="h-5 w-5 text-primary" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{artifact.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fileTypeLabel}</p>
            </div>

            {/* View indicator */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span>Click to view</span>
            </div>
        </div>
    );
}
