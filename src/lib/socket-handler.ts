import { Server, Socket } from 'socket.io';
import { roomUsers, roomState, getRoomState } from './socket-state';

const socketToUsername = new Map<string, string>();
const usernameToSocket = new Map<string, string>();

export function registerSocketEvents(io: Server) {
    io.on('connection', (socket: Socket) => {
        let currentRoom: string | null = null;
        let currentUsername: string | null = null;

        socket.on('join-room', ({ roomId: rawRoomId, username }) => {
            const roomId = String(rawRoomId || '').trim();
            currentRoom = roomId;
            currentUsername = username;

            socketToUsername.set(socket.id, username);
            usernameToSocket.set(username, socket.id);

            socket.join(roomId);

            if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
            const usersInRoom = roomUsers.get(roomId)!;
            usersInRoom.set(socket.id, username);

            const users = Array.from(new Set(usersInRoom.values()));
            io.to(roomId).emit('users-update', users);

            if (roomState.has(roomId)) {
                socket.emit('room-state', roomState.get(roomId));
            }
        });

        socket.on('code-change', ({ roomId, code }) => {
            const rId = String(roomId || '').trim();
            getRoomState(rId).code = code;
            socket.to(rId).emit('code-change', { code });
        });

        socket.on('language-change', ({ roomId, language, code }) => {
            const rId = String(roomId || '').trim();
            Object.assign(getRoomState(rId), { language, code });
            socket.to(rId).emit('language-change', { language, code });
        });

        socket.on('input-change', ({ roomId, input }) => {
            const rId = String(roomId || '').trim();
            getRoomState(rId).input = input;
            socket.to(rId).emit('input-change', { input });
        });

        socket.on('execution-start', ({ roomId }) => {
            const rId = String(roomId || '').trim();
            socket.to(rId).emit('execution-start');
        });

        socket.on('execution-result', ({ roomId, output, error, executionTime }) => {
            const rId = String(roomId || '').trim();
            Object.assign(getRoomState(rId), { output, error, executionTime });
            socket.to(rId).emit('execution-result', { output, error, executionTime });
        });

        socket.on('user-speaking', ({ roomId, username, isSpeaking }) => {
            const rId = String(roomId || '').trim();
            io.to(rId).emit('user-speaking', { username, isSpeaking });
        });

        socket.on('audio-broadcast-start', ({ roomId, username }) => {
            const rId = String(roomId || '').trim();
            // Broadcast to all users in the room that this user is now streaming audio
            socket.to(rId).emit('audio-broadcast-start', { username });
        });

        socket.on('webrtc-offer', ({ to, roomId, offer }) => {
            const rId = String(roomId || '').trim();
            const fromUsername = currentUsername;
            
            const targetSocketId = usernameToSocket.get(to);
            
            if (targetSocketId) {
                io.to(targetSocketId).emit('webrtc-offer', { 
                    from: fromUsername, 
                    offer,
                    roomId: rId
                });
            } else {
                console.warn(`[Socket] Target user "${to}" not found in mapping, broadcasting to room "${rId}"`);
                socket.to(rId).emit('webrtc-offer', { 
                    from: fromUsername, 
                    offer,
                    roomId: rId
                });
            }
        });

        // WebRTC answer - send to specific user that it targets
        socket.on('webrtc-answer', ({ to, roomId, answer }) => {
            const rId = String(roomId || '').trim();
            const fromUsername = currentUsername;
            
            const targetSocketId = usernameToSocket.get(to);
            
            if (targetSocketId) {
                // Send directly to the target user
                io.to(targetSocketId).emit('webrtc-answer', { 
                    from: fromUsername, 
                    answer,
                    roomId: rId
                });
            } else {
                // Fallback: broadcast to room if target not found
                console.warn(`[Socket] Target user "${to}" not found in mapping, broadcasting to room "${rId}"`);
                socket.to(rId).emit('webrtc-answer', { 
                    from: fromUsername, 
                    answer,
                    roomId: rId
                });
            }
        });

        // WebRTC ICE candidate - send to specific user that it targets
        socket.on('webrtc-ice-candidate', ({ to, roomId, candidate }) => {
            const rId = String(roomId || '').trim();
            const fromUsername = currentUsername;
            const targetSocketId = usernameToSocket.get(to);
            
            if (targetSocketId) {
                // Send directly to the target user
                io.to(targetSocketId).emit('webrtc-ice-candidate', { 
                    from: fromUsername, 
                    candidate,
                    roomId: rId
                });
            } else {
                // Fallback: broadcast to room if target not found
                console.warn(`[WebRTC] Target user "${to}" not found, broadcasting to room`);
                socket.to(rId).emit('webrtc-ice-candidate', { 
                    from: fromUsername, 
                    candidate,
                    roomId: rId
                });
            }
        });

        socket.on('disconnect', () => {
            if (!currentRoom || !roomUsers.has(currentRoom)) {
                socketToUsername.delete(socket.id);
                if (currentUsername) {
                    usernameToSocket.delete(currentUsername);
                }
                return;
            }

            const usersInRoom = roomUsers.get(currentRoom)!;
            usersInRoom.delete(socket.id);
            const remaining = Array.from(new Set(usersInRoom.values()));

            io.to(currentRoom).emit('users-update', remaining);

            // Clean up socket-to-username mappings
            socketToUsername.delete(socket.id);
            if (currentUsername) {
                usernameToSocket.delete(currentUsername);
            }

            if (remaining.length === 0) {
                roomUsers.delete(currentRoom);
                roomState.delete(currentRoom);
            }
        });
    });
}
