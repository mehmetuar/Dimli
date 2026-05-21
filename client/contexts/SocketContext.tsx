import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../services/authStorage';

const SOCKET_URL = 'https://dimli-server.onrender.com';

const SocketContext = createContext<Socket | null>(null);

function connectSocket(token: string): Socket {
    return io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
    });
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            (window as any).__socket = null;
            setSocket(null);
        }
    };

    const connect = (token: string) => {
        const s = connectSocket(token);
        socketRef.current = s;
        (window as any).__socket = s;
        setSocket(s);
    };

    useEffect(() => {
        const token = getToken();
        if (token) connect(token);
        return () => { disconnect(); };
    }, []);

    // Login / logout sırasında AuthContext tarafından dispatch edilen event
    useEffect(() => {
        const handleTokenChanged = () => {
            disconnect();
            const token = getToken();
            if (token) connect(token);
        };

        window.addEventListener('auth:tokenChanged', handleTokenChanged);
        return () => window.removeEventListener('auth:tokenChanged', handleTokenChanged);
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
