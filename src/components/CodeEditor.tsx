"use client";

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { createWebRTCManager } from '@/lib/webrtc-manager';
import Header from './codeEditor/Header';
import EditorPanel from './codeEditor/EditorPanel';
import UsersPanel from './codeEditor/UsersPanel';
import InputPanel from './codeEditor/InputPanel';
import OutputPanel from './codeEditor/OutputPanel';
import ExitConfirmDialog from './codeEditor/ExitConfirmDialog';
import { LANGUAGES, THEMES } from './codeEditor/constants';
import { useCodeExecution } from './codeEditor/useCodeExecution';
import { useCodeHandlers } from './codeEditor/useCodeHandlers';
import { useSocketSetup } from './codeEditor/useSocketSetup';
import { useMicrophoneHandler } from './codeEditor/useMicrophoneHandler';
import { useRemoteAudioHandler } from './codeEditor/useRemoteAudioHandler';

interface CodeEditorProps {
    roomId: string;
    username: string;
    initialCode?: string;
    initialLanguage?: string;
}

export default function CodeEditor({ roomId, username, initialCode, initialLanguage }: CodeEditorProps) {
    const router = useRouter();
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
    const { toast } = useToast();

    // State management
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

    // Use custom hooks
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

    const { handleCodeChange, handleInputChange, handleLanguageChange, handleDownloadCode, handleSaveCode, handleEditorDidMount } = useCodeHandlers({
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

    const handleExitRoom = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        router.push('/');
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            <Header
                isConnected={isConnected}
                roomId={roomId}
                language={language}
                theme={theme}
                isMicEnabled={isMicEnabled}
                isExecuting={isExecuting}
                panelPosition={panelPosition}
                languages={LANGUAGES}
                themes={THEMES}
                onExitClick={() => setShowExitConfirm(true)}
                onMicToggle={handleMicrophoneToggle}
                onLanguageChange={handleLanguageChange}
                onThemeChange={setTheme}
                onDownloadCode={handleDownloadCode}
                onSaveCode={handleSaveCode}
                onRunCode={handleRunCode}
                onPanelPositionChange={setPanelPosition}
            />

            {(() => {
                const isHorizontal = panelPosition === 'left' || panelPosition === 'right';
                const borderClass = panelPosition === 'right' ? 'border-l border-zinc-800'
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

                return (
                    <div className={`flex-1 flex ${bodyFlexClass} overflow-hidden`}>
                        <EditorPanel
                            language={language}
                            code={code}
                            theme={theme}
                            onChange={handleCodeChange}
                            onMount={handleEditorDidMount}
                        />

                        <div className={`${panelSizeClass} ${borderClass} bg-zinc-900 flex ${usersFlexClass} overflow-hidden`}>
                            <UsersPanel
                                onlineUsers={onlineUsers}
                                username={username}
                                speakingUsers={speakingUsers}
                                isHorizontal={isHorizontal}
                            />

                            <div className={`flex ${ioFlexClass} overflow-hidden min-h-0`}>
                                <InputPanel
                                    input={input}
                                    isHorizontal={isHorizontal}
                                    onChange={handleInputChange}
                                    onClear={() => handleInputChange('')}
                                />

                                <OutputPanel
                                    output={output}
                                    executionTime={executionTime}
                                    isHorizontal={isHorizontal}
                                />
                            </div>
                        </div>
                    </div>
                );
            })()}

            <ExitConfirmDialog
                isOpen={showExitConfirm}
                onConfirm={handleExitRoom}
                onCancel={() => setShowExitConfirm(false)}
            />
        </div>
    );
}
