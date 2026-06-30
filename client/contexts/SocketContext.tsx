import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = 'https://dimli-server.onrender.com';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    // Socket'i auth TOKEN'ına bağla: token gelir gelmez (initAuth çözülünce) bağlan.
    // Eski mount-anı getToken() deseni çalışmıyordu — React çocuk effect'leri ebeveynden
    // ÖNCE çalıştırdığı için SocketProvider mount'ta token henüz null görüyordu ve bir
    // daha denemiyordu. Token state'i (login/logout/hesap-değişimi/expiry) tek kaynak.
    const { token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token) return;

        const s = io(SOCKET_URL, {
            auth: { token },
            // ws öncelik + polling fallback (WS'i engelleyen ağ/proxy'lerde kurtarır).
            transports: ['websocket', 'polling'],
            // 10'da kalıcı pes etme YOK; mobilde arka plan/ağ kaybı sonrası kendini toparlar.
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
        socketRef.current = s;
        (window as any).__socket = s;
        setSocket(s);

        s.on('connect', () => console.log('[socket] connect', s.id));
        s.on('disconnect', (reason) => console.log('[socket] disconnect', reason));
        s.on('connect_error', (err) =>
            console.log('[socket] connect_error', err?.message),
        );

        // StrictMode (dev) effect'i çift çağırır (create A → cleanup A → create B).
        // closure'daki `s`'i kapat; global/state'i KORUMALI temizle ki ikinci
        // çalıştırmanın canlı socket'ini yanlışlıkla null'lamayalım.
        return () => {
            s.off('connect');
            s.off('disconnect');
            s.off('connect_error');
            s.disconnect();
            if (socketRef.current === s) socketRef.current = null;
            if ((window as any).__socket === s) (window as any).__socket = null;
            setSocket((prev) => (prev === s ? null : prev));
        };
    }, [token]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket(): Socket | null {
    return useContext(SocketContext);
}
