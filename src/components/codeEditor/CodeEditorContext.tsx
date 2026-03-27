"use client";

import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { createWebRTCManager } from '@/lib/webrtc-manager';
import { LANGUAGES, THEMES } from './constants';
import { useCodeExecution } from './useCodeExecution';
import { useCodeHandlers } from './useCodeHandlers';
import { useSocketSetup } from './useSocketSetup';
import { useMicrophoneHandler } from './useMicrophoneHandler';
import { useRemoteAudioHandler } from './useRemoteAudioHandler';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CodeEditorContextType {
    // State
    roomId: string;
    username: string;
    language: string;
    theme: string;
    code: string;
    output: string;
    input: string;
    isExecuting: boolean;
    executionTime: number | null;
    onlineUsers: string[];
    isConnected: boolean;
    panelPosition: 'right' | 'left' | 'bottom' | 'top';
    showExitConfirm: boolean;
    isMicEnabled: boolean;
    isSpeaking: boolean;
    speakingUsers: Set<string>;

    // Derived layout helpers
    isHorizontal: boolean;
    borderClass: string;
    panelSizeClass: string;
    bodyFlexClass: string;
    usersFlexClass: string;
    ioFlexClass: string;

    // Constants
    languages: typeof LANGUAGES;
    themes: typeof THEMES;

    // Handlers
    handleRunCode: () => void;
    handleCodeChange: (value: string | undefined) => void;
    handleInputChange: (value: string) => void;
    handleLanguageChange: (lang: string) => void;
    handleDownloadCode: () => void;
    handleSaveCode: () => void;
    handleEditorDidMount: (editor: any) => void;
    handleMicrophoneToggle: () => void;
    handleExitRoom: () => void;

    // Setters exposed for dialog
    setShowExitConfirm: (val: boolean) => void;
    setTheme: (val: string) => void;
    setPanelPosition: (val: 'right' | 'left' | 'bottom' | 'top') => void;
}

const CodeEditorContext = createContext<CodeEditorContextType | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCodeEditor(): CodeEditorContextType {
    const ctx = useContext(CodeEditorContext);
    if (!ctx) {
        throw new Error('useCodeEditor must be used inside <CodeEditorProvider>');
    }
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface CodeEditorProviderProps {
    roomId: string;
    username: string;
    initialCode?: string;
    initialLanguage?: string;
    children: React.ReactNode;
}

export function CodeEditorProvider({
    roomId,
    username,
    initialCode,
    initialLanguage,
    children,
}: CodeEditorProviderProps) {
    const router = useRouter();
    const { toast } = useToast();

    // ── Refs ──────────────────────────────────────────────────────────────────
    const editorRef = useRef<any>(null);
    const socketRef = useRef<Socket | null>(null);
    const isRemoteChange = useRef(false);
    const webrtcManagerRef = useRef<ReturnType<typeof createWebRTCManager> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const remoteAudioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const volumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const remoteAudioElementsRef = useRef<Map<string, { audio: HTMLAudioElement; source: MediaElementAudioSourceNode }>>(new Map());
    const isSpeakingRef = useRef(false);

    // ── State ─────────────────────────────────────────────────────────────────
    const [language, setLanguage] = useState(initialLanguage || 'javascript');
    const [theme, setTheme] = useState('vs-dark');
    const [code, setCode] = useState(initialCode || LANGUAGES[0].defaultCode);
    const [output, setOutput] = useState('');
    const [input, setInput] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([username]);
    const [isConnected, setIsConnected] = useState(false);
    const [panelPosition, setPanelPosition] = useState<'right' | 'left' | 'bottom' | 'top'>('right');
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [isMicEnabled, setIsMicEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

    // ── Custom Hooks ──────────────────────────────────────────────────────────
    const { handleRemoteTrack } = useRemoteAudioHandler({
        remoteAudioContextRef,
        remoteAudioElementsRef,
    });

    const { handleRunCode } = useCodeExecution({
        code,
        language,
        input,
        roomId,
        socketRef,
        setIsExecuting,
        setOutput,
        setExecutionTime,
        toast,
    });

    const {
        handleCodeChange,
        handleInputChange,
        handleLanguageChange,
        handleDownloadCode,
        handleSaveCode,
        handleEditorDidMount,
    } = useCodeHandlers({
        roomId,
        socketRef,
        editorRef,
        isRemoteChange,
        code,
        language,
        setLanguage,
        setCode,
        setInput,
        toast,
    });

    useSocketSetup({
        roomId,
        username,
        socketRef,
        isRemoteChange,
        editorRef,
        isMicEnabled,
        webrtcManagerRef,
        handleRemoteTrack,
        onlineUsers,
        setIsConnected,
        setCode,
        setLanguage,
        setInput,
        setOutput,
        setExecutionTime,
        setOnlineUsers,
        setSpeakingUsers,
        toast,
    });

    const { handleMicrophoneToggle } = useMicrophoneHandler({
        roomId,
        username,
        isMicEnabled,
        onlineUsers,
        socketRef,
        webrtcManagerRef,
        audioContextRef,
        analyserRef,
        micStreamRef,
        volumeCheckIntervalRef,
        isSpeakingRef,
        handleRemoteTrack,
        setIsMicEnabled,
        setIsSpeaking,
        toast,
    });

    const handleExitRoom = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        router.push('/');
    }, [router]);

    // ── Derived Layout Values ─────────────────────────────────────────────────
    const isHorizontal = panelPosition === 'left' || panelPosition === 'right';

    const borderClass =
        panelPosition === 'right' ? 'border-l border-zinc-800'
            : panelPosition === 'left' ? 'border-r border-zinc-800'
                : panelPosition === 'bottom' ? 'border-t border-zinc-800'
                    : 'border-b border-zinc-800';

    const panelSizeClass = isHorizontal ? 'w-[400px] shrink-0' : 'h-[280px] shrink-0 w-full';

    const bodyFlexClass =
        panelPosition === 'right' ? 'flex-row'
            : panelPosition === 'left' ? 'flex-row-reverse'
                : panelPosition === 'top' ? 'flex-col-reverse'
                    : 'flex-col';

    const usersFlexClass = isHorizontal ? 'flex-col' : 'flex-row items-start gap-4';
    const ioFlexClass = isHorizontal ? 'flex-col' : 'flex-row gap-4 flex-1';

    // ── Context Value ─────────────────────────────────────────────────────────
    const value: CodeEditorContextType = {
        roomId,
        username,
        language,
        theme,
        code,
        output,
        input,
        isExecuting,
        executionTime,
        onlineUsers,
        isConnected,
        panelPosition,
        showExitConfirm,
        isMicEnabled,
        isSpeaking,
        speakingUsers,
        isHorizontal,
        borderClass,
        panelSizeClass,
        bodyFlexClass,
        usersFlexClass,
        ioFlexClass,
        languages: LANGUAGES,
        themes: THEMES,
        handleRunCode,
        handleCodeChange,
        handleInputChange,
        handleLanguageChange,
        handleDownloadCode,
        handleSaveCode,
        handleEditorDidMount,
        handleMicrophoneToggle,
        handleExitRoom,
        setShowExitConfirm,
        setTheme,
        setPanelPosition,
    };

    return (
        <CodeEditorContext.Provider value={value}>
            {children}
        </CodeEditorContext.Provider>
    );
}
