"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Sun, Moon } from "lucide-react"

interface SettingsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const isDark = resolvedTheme === "dark"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Manage your interface preferences and theme settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <span className="font-medium text-sm">
                                Theme Mode
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Switch between light and dark mode
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Sun className="size-4 text-muted-foreground" />
                            <Switch
                                id="theme-mode"
                                checked={isDark}
                                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                            />
                            <Moon className="size-4 text-muted-foreground" />
                        </div>
                    </div>
                </div>

                <DialogFooter showCloseButton />
            </DialogContent>
        </Dialog>
    )
}
