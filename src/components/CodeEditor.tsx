"use client";

import { CodeEditorProvider, useCodeEditor } from './codeEditor/CodeEditorContext';
import Header from './codeEditor/Header';
import EditorPanel from './codeEditor/EditorPanel';
import UsersPanel from './codeEditor/UsersPanel';
import InputPanel from './codeEditor/InputPanel';
import OutputPanel from './codeEditor/OutputPanel';
import ExitConfirmDialog from './codeEditor/ExitConfirmDialog';

interface CodeEditorProps {
    roomId: string;
    username: string;
    initialCode?: string;
    initialLanguage?: string;
}

function CodeEditorLayout() {
    const {
        panelSizeClass,
        borderClass,
        bodyFlexClass,
        usersFlexClass,
        ioFlexClass,
    } = useCodeEditor();

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            <Header />

            <div className={`flex-1 flex ${bodyFlexClass} overflow-hidden`}>
                <EditorPanel />

                <div className={`${panelSizeClass} ${borderClass} bg-zinc-900 flex ${usersFlexClass} overflow-hidden`}>
                    <UsersPanel />

                    <div className={`flex ${ioFlexClass} overflow-hidden min-h-0`}>
                        <InputPanel />
                        <OutputPanel />
                    </div>
                </div>
            </div>

            <ExitConfirmDialog />
        </div>
    );
}

export default function CodeEditor({ roomId, username, initialCode, initialLanguage }: CodeEditorProps) {
    return (
        <CodeEditorProvider
            roomId={roomId}
            username={username}
            initialCode={initialCode}
            initialLanguage={initialLanguage}
        >
            <CodeEditorLayout />
        </CodeEditorProvider>
    );
}
