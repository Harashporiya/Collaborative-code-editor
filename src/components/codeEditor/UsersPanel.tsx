"use client";

import React from 'react';
import { useCodeEditor } from './CodeEditorContext';

const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-yellow-500',
];

function avatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function UsersPanel() {
    const { onlineUsers, username, speakingUsers, isHorizontal } = useCodeEditor();

    return (
        <div className={`${isHorizontal ? 'border-b border-zinc-800' : 'border-r border-zinc-800 w-48 shrink-0 flex flex-col overflow-auto'}`}>
            <div className="px-4 py-2 bg-zinc-800/80 border-b border-zinc-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-semibold text-sm">Online</span>
                </div>
                <span className="text-xs text-zinc-500">{onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="p-3 flex flex-wrap gap-2 overflow-auto">
                {onlineUsers.map((user, idx) => {
                    const isSpeaking = speakingUsers.has(user);
                    return (
                        <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${isSpeaking
                                ? 'bg-green-900/50 border-green-500 shadow-lg shadow-green-500/30'
                                : 'bg-zinc-800 border-zinc-700'
                            }`}>
                            <div className={`w-6 h-6 rounded-full ${avatarColor(user)} flex items-center justify-center text-white text-xs font-bold shrink-0 ${isSpeaking ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-zinc-900' : ''
                                }`}>
                                {user.charAt(0).toUpperCase()}
                            </div>
                            <span className={`text-sm font-medium ${isSpeaking ? 'text-green-300' : 'text-zinc-200'
                                }`}>{user}</span>
                            {isSpeaking && (
                                <span className="text-xs text-green-400 animate-pulse ml-1">●</span>
                            )}
                            {user === username && (
                                <span className="text-xs text-zinc-500 ml-auto">(you)</span>
                            )}
                        </div>
                    );
                })}
                {onlineUsers.length === 0 && (
                    <p className="text-xs text-zinc-600 italic">No users connected</p>
                )}
            </div>
        </div>
    );
}
