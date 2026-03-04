"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Play, Save, Download, Wifi, WifiOff, PanelRight, PanelLeft, PanelTop, PanelBottom, LogOut, Mic, MicOff } from 'lucide-react';

interface HeaderProps {
    isConnected: boolean;
    roomId: string;
    language: string;
    theme: string;
    isMicEnabled: boolean;
    isExecuting: boolean;
    panelPosition: 'right' | 'left' | 'bottom' | 'top';
    languages: Array<{ value: string; label: string; defaultCode: string; inputHint: string }>;
    themes: Array<{ value: string; label: string }>;
    onExitClick: () => void;
    onMicToggle: () => void;
    onLanguageChange: (lang: string) => void;
    onThemeChange: (theme: string) => void;
    onDownloadCode: () => void;
    onSaveCode: () => void;
    onRunCode: () => void;
    onPanelPositionChange: (pos: 'right' | 'left' | 'bottom' | 'top') => void;
}

export default function Header({
    isConnected,
    roomId,
    language,
    theme,
    isMicEnabled,
    isExecuting,
    panelPosition,
    languages,
    themes,
    onExitClick,
    onMicToggle,
    onLanguageChange,
    onThemeChange,
    onDownloadCode,
    onSaveCode,
    onRunCode,
    onPanelPositionChange,
}: HeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    {isConnected
                        ? <Wifi className="w-3.5 h-3.5 text-green-400" />
                        : <WifiOff className="w-3.5 h-3.5 text-zinc-500" />}
                    <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-zinc-500'}`}>
                        {isConnected ? 'Live' : 'Offline'}
                    </span>
                </div>
                <div className="text-zinc-600">|</div>
                <div className="text-sm text-zinc-400">Room: <span className="text-zinc-300 font-mono">{roomId.slice(0, 12)}…</span></div>
                <Button
                    onClick={onExitClick}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors ml-2"
                    title="Exit room"
                >
                    <LogOut className="w-4 h-4 mr-1.5" />
                    Exit
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    onClick={onMicToggle}
                    variant="outline"
                    size="sm"
                    className={`transition-colors ${isMicEnabled
                            ? 'bg-green-600/20 border-green-600/40 text-green-400 hover:bg-green-600/30'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    title={isMicEnabled ? 'Microphone is On' : 'Turn Microphone On'}
                >
                    {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>

                <div className="flex items-center gap-0.5 bg-zinc-800 border border-zinc-700 rounded-md p-0.5" title="IO Panel Position">
                    {([
                        { pos: 'top', Icon: PanelTop, label: 'Top' },
                        { pos: 'left', Icon: PanelLeft, label: 'Left' },
                        { pos: 'right', Icon: PanelRight, label: 'Right' },
                        { pos: 'bottom', Icon: PanelBottom, label: 'Bottom' },
                    ] as const).map(({ pos, Icon, label }) => (
                        <button
                            key={pos}
                            type="button"
                            title={`Panel ${label}`}
                            onClick={() => onPanelPositionChange(pos)}
                            className={`p-1.5 rounded transition-colors ${panelPosition === pos
                                ? 'bg-green-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                        </button>
                    ))}
                </div>

                <Select value={language} onValueChange={onLanguageChange}>
                    <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                        {languages.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={theme} onValueChange={onThemeChange}>
                    <SelectTrigger className="w-[130px] bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                        {themes.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button onClick={onDownloadCode} variant="outline" size="sm" className="bg-zinc-800 border-zinc-700">
                    <Download className="w-4 h-4 mr-2" />Download
                </Button>

                <Button onClick={onSaveCode} variant="outline" size="sm" className="bg-zinc-800 border-zinc-700">
                    <Save className="w-4 h-4 mr-2" />Save
                </Button>

                <Button onClick={onRunCode} disabled={isExecuting} className="bg-green-600 hover:bg-green-700" size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    {isExecuting ? 'Running…' : 'Run Code'}
                </Button>
            </div>
        </div>
    );
}
