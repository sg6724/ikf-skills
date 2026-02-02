'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
    className?: string;
}

/**
 * A blinking cursor/typing indicator that shows the AI is generating a response.
 * More subtle and elegant than a spinning loader.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
    return (
        <div className={cn('flex items-center gap-1 py-2', className)}>
            <span className="text-muted-foreground text-sm">Thinking</span>
            <span className="flex gap-0.5">
                <span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
                    style={{ animationDelay: '0ms' }}
                />
                <span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
                    style={{ animationDelay: '150ms' }}
                />
                <span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
                    style={{ animationDelay: '300ms' }}
                />
            </span>
        </div>
    );
}
