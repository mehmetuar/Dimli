import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#111b2e]">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(prev => !prev)}
            />
            <main className="flex-1 min-w-0 overflow-y-auto">
                {/* Mobile top bar spacing */}
                <div className="md:hidden h-14" />
                {children}
            </main>
        </div>
    );
};

export default Layout;
