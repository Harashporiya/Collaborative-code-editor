"use client";

import Editor from '@monaco-editor/react';
import { useCodeEditor } from './CodeEditorContext';

export default function EditorPanel() {
    const { language, code, theme, handleCodeChange, handleEditorDidMount } = useCodeEditor();

    return (
        <div className="flex-1 min-w-0 min-h-0">
            <Editor
                height="100%"
                language={language}
                value={code}
                theme={theme}
                onChange={handleCodeChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    formatOnPaste: true,
                    formatOnType: true,
                }}
            />
        </div>
    );
}
