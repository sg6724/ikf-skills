"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
    className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-1.5 py-2",
                className
            )}
        >
            <span
                className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                style={{ animationDelay: "0ms", animationDuration: "600ms" }}
            />
            <span
                className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                style={{ animationDelay: "150ms", animationDuration: "600ms" }}
            />
            <span
                className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                style={{ animationDelay: "300ms", animationDuration: "600ms" }}
            />
        </div>
    );
}
