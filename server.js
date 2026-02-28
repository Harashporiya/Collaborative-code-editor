'use strict';

const express = require('express');
const next = require('next');
const { Server: SocketServer } = require('socket.io');
const { spawn } = require('child_process');
const { writeFileSync, mkdirSync, rmSync } = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = 'localhost';
const IS_DEV = process.env.NODE_ENV !== 'production';

const VERCEL_URL = process.env.VERCEL_APP_URL || '';

const roomUsers = new Map();
const roomState = new Map();

function getRoomState(roomId) {
    if (!roomState.has(roomId)) roomState.set(roomId, {});
    return roomState.get(roomId);
}

function buildDockerArgs(language, tempDir) {
    const base = [
        'run', '--rm',
        '--network', 'none',
        '--memory', '256m',
        '--cpus', '0.5',
        '-v', `${tempDir}:/app`,
        '-w', '/app',
    ];

    switch (language) {
        case 'javascript':
            return [...base, 'node:18-alpine', 'sh', '-c', 'node main.js <input.txt 2>&1'];
        case 'python':
            return [...base, 'python:3.11-alpine', 'sh', '-c', 'python main.py <input.txt 2>&1'];
        case 'cpp':
            return [...base, 'gcc:latest', 'sh', '-c', 'g++ main.cpp -o output 2>compile_error.txt && ./output <input.txt 2>&1 || (cat compile_error.txt >&2 && exit 1)'];
        case 'c':
            return [...base, 'gcc:latest', 'sh', '-c', 'gcc main.c -o output 2>compile_error.txt && ./output <input.txt 2>&1 || (cat compile_error.txt >&2 && exit 1)'];
        case 'java':
            return [...base, 'eclipse-temurin:17-jdk-alpine', 'sh', '-c', 'javac Main.java 2>compile_error.txt && java Main <input.txt 2>&1 || (cat compile_error.txt >&2 && exit 1)'];
        default:
            return null;
    }
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

    app.use(cors({
        origin: VERCEL_URL || '*',
        methods: ['GET', 'POST'],
    }));

    app.use(express.json());

    app.post('/api/execute', (req, res) => {
        const { code, language, input } = req.body;

        if (!code || !language) {
            return res.status(400).json({ error: 'code and language are required' });
        }

        const tempDir = path.join('/tmp', uuidv4());
        mkdirSync(tempDir, { recursive: true });

        const inputFile = path.join(tempDir, 'input.txt');
        writeFileSync(inputFile, typeof input === 'string' ? input : '');

        const ext = { javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', c: 'c' }[language] || language;
        const filename = language === 'java' ? 'Main.java' : `main.${ext}`;
        writeFileSync(path.join(tempDir, filename), code);

        const dockerArgs = buildDockerArgs(language, tempDir);
        if (!dockerArgs) {
            rmSync(tempDir, { recursive: true, force: true });
            return res.status(400).json({ error: `Unsupported language: ${language}` });
        }

        const docker = spawn('docker', dockerArgs, { timeout: 30000 });
        let stdout = '';
        let stderr = '';

        docker.stdout.on('data', (d) => { stdout += d.toString(); });
        docker.stderr.on('data', (d) => { stderr += d.toString(); });

        docker.on('close', (code) => {
            rmSync(tempDir, { recursive: true, force: true });
            if (code !== 0) {
                res.json({ output: stdout, error: stderr || `Process exited with code ${code}` });
            } else {
                res.json({ output: stdout || '(No output)' });
            }
        });

        docker.on('error', (err) => {
            rmSync(tempDir, { recursive: true, force: true });
            res.status(500).json({ output: '', error: `Docker error: ${err.message}` });
        });
    });

    const server = app.listen(PORT, () => {
        console.log(`\n  ▲  Socket.io + Execute server ready`);
        console.log(`  ➜  http://localhost:${PORT}  [${IS_DEV ? 'dev' : 'prod'}]\n`);
    });

    const io = new SocketServer(server, {
        cors: {
            origin: VERCEL_URL || '*',
            methods: ['GET', 'POST'],
        },
    });

    registerSocketEvents(io);
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
