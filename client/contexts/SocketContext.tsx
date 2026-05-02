import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://dimli-server.onrender.com';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const s = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnectionDelay: 2000,
            reconnectionAttempts: 10,
        });

        socketRef.current = s;
        (window as any).__socket = s;
        setSocket(s);

        return () => {
            s.disconnect();
            socketRef.current = null;
            (window as any).__socket = null;
            setSocket(null);
        };
    }, []);

    // Reconnect when token changes (login / logout)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key !== 'token') return;

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                (window as any).__socket = null;
                setSocket(null);
            }

            const newToken = e.newValue;
            if (!newToken) return;

            const s = io(SOCKET_URL, {
                auth: { token: newToken },
                transports: ['websocket'],
                reconnectionDelay: 2000,
                reconnectionAttempts: 10,
            });

            socketRef.current = s;
            (window as any).__socket = s;
            setSocket(s);
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket(): Socket | null {
    return useContext(SocketContext);
}
