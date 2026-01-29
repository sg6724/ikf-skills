"use client";

import { CheckCircle2, Loader2, XCircle, Clock, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCall {
    id: string;
    name: string;
    status: "pending" | "running" | "completed" | "failed";
    duration?: number;
}

interface ToolCallDisplayProps {
    toolCall: ToolCall;
}

const statusConfig = {
    pending: {
        icon: Clock,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        label: "Pending",
        animate: false,
    },
    running: {
        icon: Loader2,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        label: "Running",
        animate: true,
    },
    completed: {
        icon: CheckCircle2,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        label: "Completed",
        animate: false,
    },
    failed: {
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        label: "Failed",
        animate: false,
    },
};

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
    const config = statusConfig[toolCall.status];
    const StatusIcon = config.icon;

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
                "bg-card/50 border-border",
                "hover:bg-card"
            )}
        >
            {/* Tool Icon */}
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Tool Info */}
            <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-medium truncate">{toolCall.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Skill execution</p>
            </div>

            {/* Status Badge */}
            <div
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    config.bgColor,
                    config.color
                )}
            >
                <StatusIcon
                    className={cn("h-3.5 w-3.5", config.animate && "animate-spin")}
                />
                {config.label}
            </div>

            {/* Duration */}
            {toolCall.duration !== undefined && (
                <div className="text-xs text-muted-foreground font-mono tabular-nums">
                    {toolCall.duration.toFixed(1)}s
                </div>
            )}
        </div>
    );
}
