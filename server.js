'use strict';

const express = require('express');
const { Server: SocketServer } = require('socket.io');
const cors = require('cors');

const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_DEV = process.env.NODE_ENV !== 'production';
const VERCEL_URL = process.env.VERCEL_APP_URL || '*';

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

const PISTON_LANG = {
    javascript: { language: 'javascript', version: '18.15.0' },
    python: { language: 'python', version: '3.10.0' },
    java: { language: 'java', version: '15.0.2' },
    cpp: { language: 'c++', version: '10.2.0' },
    c: { language: 'c', version: '10.2.0' },
};

const PISTON_FILENAME = {
    javascript: 'main.js',
    python: 'main.py',
    java: 'Main.java',
    cpp: 'main.cpp',
    c: 'main.c',
};

const roomUsers = new Map();
const roomState = new Map();

function getRoomState(roomId) {
    if (!roomState.has(roomId)) roomState.set(roomId, {});
    return roomState.get(roomId);
}

function registerSocketEvents(io) {
    io.on('connection', (socket) => {
        let currentRoom = null;
        let currentUsername = null;

        socket.on('join-room', ({ roomId, username }) => {
            currentRoom = roomId;
            currentUsername = username;

            socket.join(roomId);

            if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
            roomUsers.get(roomId).set(socket.id, username);

            const users = [...roomUsers.get(roomId).values()];
            io.to(roomId).emit('users-update', users);

            if (roomState.has(roomId)) {
                socket.emit('room-state', roomState.get(roomId));
            }

            console.log(`[join]  ${username} → room ${roomId}  (${users.length} online)`);
        });

        socket.on('code-change', ({ roomId, code }) => {
            getRoomState(roomId).code = code;
            socket.to(roomId).emit('code-change', { code });
        });

        socket.on('language-change', ({ roomId, language, code }) => {
            Object.assign(getRoomState(roomId), { language, code });
            socket.to(roomId).emit('language-change', { language, code });
        });

        socket.on('input-change', ({ roomId, input }) => {
            getRoomState(roomId).input = input;
            socket.to(roomId).emit('input-change', { input });
        });

        socket.on('execution-start', ({ roomId }) => {
            socket.to(roomId).emit('execution-start');
        });

        socket.on('execution-result', ({ roomId, output, error, executionTime }) => {
            Object.assign(getRoomState(roomId), { output, error, executionTime });
            socket.to(roomId).emit('execution-result', { output, error, executionTime });
        });

        socket.on('disconnect', () => {
            if (!currentRoom || !roomUsers.has(currentRoom)) return;

            roomUsers.get(currentRoom).delete(socket.id);
            const remaining = [...roomUsers.get(currentRoom).values()];

            io.to(currentRoom).emit('users-update', remaining);

            if (remaining.length === 0) {
                roomUsers.delete(currentRoom);
                roomState.delete(currentRoom);
            }

            console.log(`[leave] ${currentUsername} ← room ${currentRoom}  (${remaining.length} remaining)`);
        });
    });
}

async function start() {
    const app = express();

    app.use(cors({ origin: VERCEL_URL, methods: ['GET', 'POST'] }));
    app.use(express.json());

    app.post('/api/execute', async (req, res) => {
        const { code, language, input } = req.body;

        if (!code || !language) {
            return res.status(400).json({ error: 'code and language are required' });
        }

        const pistonLang = PISTON_LANG[language.toLowerCase()];
        if (!pistonLang) {
            return res.status(400).json({ error: `Unsupported language: ${language}` });
        }

        const filename = PISTON_FILENAME[language.toLowerCase()];

        try {
            const pistonRes = await fetch(PISTON_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: pistonLang.language,
                    version: pistonLang.version,
                    files: [{ name: filename, content: code }],
                    stdin: input ? (input.endsWith('\n') ? input : input + '\n') : '',
                }),
            });

            const data = await pistonRes.json();

            if (data.message) {
                return res.status(400).json({ error: `Piston: ${data.message}` });
            }

            const compile = data.compile || {};
            const run = data.run || {};

            if (compile.code !== undefined && compile.code !== 0) {
                return res.json({ output: '', error: compile.stderr || compile.output || 'Compilation failed' });
            }

            if (run.code !== 0 && run.stderr) {
                return res.json({ output: run.stdout || '', error: run.stderr });
            }

            return res.json({ output: run.stdout || run.output || '(No output)' });

        } catch (err) {
            return res.status(500).json({ output: '', error: `Execution service error: ${err.message}` });
        }
    });

    const server = app.listen(PORT, () => {
        console.log(`\n  ▲  Socket.io + Execute server ready`);
        console.log(`  ➜  http://localhost:${PORT}  [${IS_DEV ? 'dev' : 'prod'}]\n`);
    });

    const io = new SocketServer(server, {
        cors: { origin: VERCEL_URL, methods: ['GET', 'POST'] },
    });

    registerSocketEvents(io);
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
