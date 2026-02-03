'use client';

import { cn } from '@/lib/utils';
import { Search, Sparkles, BarChart3, MessageSquare, Plus, Mic, ArrowUp } from 'lucide-react';
import { forwardRef, useRef, useEffect, useState } from 'react';
import {
    PromptInput,
    PromptInputBody,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputActions,
    PromptInputButton,
    PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';

interface PromptSuggestion {
    icon: React.ReactNode;
    label: string;
    prompt: string;
}

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
    {
        icon: <Search className="size-4" />,
        label: 'Hygiene Check',
        prompt: 'Perform a LinkedIn hygiene check for ',
    },
    {
        icon: <Sparkles className="size-4" />,
        label: 'Content Strategy',
        prompt: 'Create a content strategy for ',
    },
    {
        icon: <BarChart3 className="size-4" />,
        label: 'Performance Marketing',
        prompt: 'Develop a performance marketing plan for ',
    },
    {
        icon: <MessageSquare className="size-4" />,
        label: 'Competitor Analysis',
        prompt: 'Analyze the competitors for ',
    },
];

interface WelcomeScreenProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    onPromptSelect: (prompt: string) => void;
    isDisabled?: boolean;
    className?: string;
}

export function WelcomeScreen({
    inputValue,
    onInputChange,
    onSubmit,
    onPromptSelect,
    isDisabled,
    className
}: WelcomeScreenProps) {

    return (
        <div className={cn("flex flex-col items-center justify-center h-full px-4", className)}>
            {/* Headline */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-foreground mb-8 tracking-tight text-center">
                What can I do for you?
            </h1>

            {/* Centered Input - The Star of the Show */}
            <div className="w-full max-w-2xl">
                <PromptInput
                    value={inputValue}
                    onValueChange={onInputChange}
                    onSubmit={(message) => {
                        if (message.text.trim()) {
                            onSubmit();
                        }
                    }}
                >
                    <PromptInputBody>
                        <PromptInputTextarea
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder="Assign a task or ask anything"
                            className="text-base"
                        />
                        <PromptInputFooter>
                            {/* Left Actions */}
                            <PromptInputActions>
                                <PromptInputButton>
                                    <Plus className="size-5" />
                                </PromptInputButton>
                            </PromptInputActions>

                            {/* Right Actions */}
                            <PromptInputActions>
                                <PromptInputButton>
                                    <Mic className="size-5" />
                                </PromptInputButton>
                                <PromptInputSubmit
                                    disabled={!inputValue.trim() || isDisabled}
                                />
                            </PromptInputActions>
                        </PromptInputFooter>
                    </PromptInputBody>
                </PromptInput>

                {/* Action Chips - Below Input */}
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => onPromptSelect(suggestion.prompt)}
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                                "text-sm font-medium",
                                "bg-secondary/80 text-secondary-foreground",
                                "border border-border/50",
                                "hover:bg-secondary hover:border-border",
                                "transition-all duration-150",
                                "hover:scale-[1.02]"
                            )}
                        >
                            <span className="text-muted-foreground">{suggestion.icon}</span>
                            {suggestion.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
