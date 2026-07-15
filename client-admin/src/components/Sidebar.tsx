import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    DimliLogo,
    IconHome,
    IconPending,
    IconCheck,
    IconX,
    IconPause,
    IconLogout,
    IconShield,
    IconMenu,
    IconClipboard,
    IconFlag,
    IconSupport,
    IconBan,
    IconPitch,
    IconTrash,
    IconTicket,
} from './Icons';
import LogoutModal from './LogoutModal';
import adminApi from '../services/adminApi';

function decodeAdminToken(): { email: string; adminRole: string } | null {
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { email: payload.email ?? '', adminRole: payload.adminRole ?? 'reviewer' };
    } catch {
        return null;
    }
}

const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Süper Admin',
    admin: 'Admin',
    reviewer: 'Gözlemci',
};

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
    collapsed?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge, collapsed, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group
            ${isActive
                ? 'bg-[#1a2d4a] text-orange-400 border-l-2 border-orange-500 pl-[10px]'
                : 'text-[#7b9ab8] hover:bg-white/5 hover:text-[#dde8f5] border-l-2 border-transparent'
            }`
        }
    >
        {/* İkon + collapsed badge noktası */}
        <span className="relative shrink-0">
            {icon}
            {collapsed && badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border border-[#0f1827] flex items-center justify-center text-[8px] text-white font-black">
                    {badge > 9 ? '9' : badge}
                </span>
            )}
        </span>

        {/* Etiket + expanded badge sayısı */}
        {!collapsed && (
            <>
                <span className="truncate">{label}</span>
                {badge !== undefined && badge > 0 && (
                    <span className="ml-auto bg-red-500/20 text-red-300 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-500/30 shrink-0">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </>
        )}
    </NavLink>
);

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
    const navigate = useNavigate();
    const [showLogout, setShowLogout] = useState(false);
    const [pendingReports, setPendingReports] = useState(0);
    const [pendingSupport, setPendingSupport] = useState(0);
    const adminInfo = decodeAdminToken();

    useEffect(() => {
        adminApi.get('/admin/reports/pending-count')
            .then(r => setPendingReports(r.data ?? 0))
            .catch(() => {});
        adminApi.get('/admin/support-tickets/pending-count')
            .then(r => setPendingSupport(r.data?.total ?? 0))
            .catch(() => {});
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate('/login');
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden md:flex flex-col h-screen sticky top-0 bg-[#0f1827] border-r border-slate-700/40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} shrink-0`}
            >
                {/* Logo + Başlık */}
                <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/40">
                    <DimliLogo size={36} className="shrink-0 drop-shadow-[0_0_10px_rgba(74,222,128,0.2)]" />
                    {!collapsed && (
                        <div className="min-w-0">
                            <p className="text-[#dde8f5] font-black text-base leading-tight truncate">DİMLİ</p>
                            <p className="text-orange-400/80 text-[10px] font-bold uppercase tracking-[0.18em]">Admin Paneli</p>
                        </div>
                    )}
                    <button
                        onClick={onToggle}
                        className="ml-auto text-slate-500 hover:text-slate-200 transition-colors shrink-0 hidden md:block"
                    >
                        <IconMenu size={16} />
                    </button>
                </div>

                {/* Admin Profil Kartı */}
                {!collapsed && adminInfo && (
                    <div className="mx-3 mt-4 mb-1 bg-[#1a2d4a] border border-slate-600/40 rounded-xl p-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                                <IconShield size={14} className="text-orange-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[#dde8f5] text-xs font-bold truncate">{adminInfo.email}</p>
                                <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20">
                                    {ROLE_LABELS[adminInfo.adminRole] ?? adminInfo.adminRole}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigasyon */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {!collapsed && (
                        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Menü</p>
                    )}
                    <NavItem to="/dashboard"       icon={<IconHome      size={18} />} label={collapsed ? '' : 'Dashboard'}              collapsed={collapsed} />
                    <NavItem to="/pending"         icon={<IconPending   size={18} />} label={collapsed ? '' : 'Bekleyen'}               collapsed={collapsed} />
                    <NavItem to="/approved"        icon={<IconCheck     size={18} />} label={collapsed ? '' : 'Onaylı'}                 collapsed={collapsed} />
                    <NavItem to="/rejected"        icon={<IconX         size={18} />} label={collapsed ? '' : 'Reddedilen'}             collapsed={collapsed} />
                    <NavItem to="/suspended"       icon={<IconPause     size={18} />} label={collapsed ? '' : 'Askıda'}                 collapsed={collapsed} />
                    <NavItem to="/change-requests" icon={<IconClipboard size={18} />} label={collapsed ? '' : 'Değişiklik İstekleri'}   collapsed={collapsed} />
                    <NavItem to="/pitch-approvals" icon={<IconPitch     size={18} />} label={collapsed ? '' : 'Saha Onayları'}          collapsed={collapsed} />
                    <NavItem to="/reports"         icon={<IconFlag      size={18} />} label={collapsed ? '' : 'Şikayetler'}             collapsed={collapsed} badge={pendingReports} />
                    <NavItem to="/support-tickets" icon={<IconSupport   size={18} />} label={collapsed ? '' : 'Destek Talepleri'}       collapsed={collapsed} badge={pendingSupport} />
                    <NavItem to="/banned-users"    icon={<IconBan       size={18} />} label={collapsed ? '' : 'Chat Yasakları'}          collapsed={collapsed} />
                    <NavItem to="/promo-codes"     icon={<IconTicket    size={18} />} label={collapsed ? '' : 'Promosyon Kodları'}       collapsed={collapsed} />
                    <NavItem to="/deleted"         icon={<IconTrash     size={18} />} label={collapsed ? '' : 'Silinen İşletmeler'}      collapsed={collapsed} />
                </nav>

                {/* Alt — Çıkış */}
                <div className="px-3 pb-5 border-t border-slate-700/40 pt-3">
                    <button
                        onClick={() => setShowLogout(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#7b9ab8] hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all"
                    >
                        <IconLogout size={18} className="shrink-0" />
                        {!collapsed && <span>Çıkış Yap</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0f1827] border-b border-slate-700/40 flex items-center gap-3 px-4 py-3">
                <button onClick={onToggle} className="text-slate-400 hover:text-slate-100 transition-colors">
                    <IconMenu size={20} />
                </button>
                <DimliLogo size={28} className="drop-shadow-[0_0_8px_rgba(74,222,128,0.2)]" />
                <span className="text-[#dde8f5] font-black text-sm">DİMLİ Admin</span>
                {pendingReports > 0 && (
                    <span className="ml-1 bg-red-500/20 text-red-300 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-500/30">
                        {pendingReports}
                    </span>
                )}
                <button
                    onClick={() => setShowLogout(true)}
                    className="ml-auto text-slate-400 hover:text-red-400 transition-colors"
                >
                    <IconLogout size={18} />
                </button>
            </div>

            {/* Mobile Sidebar Drawer */}
            {collapsed === false && (
                <div className="md:hidden fixed inset-0 z-40 flex" style={{ display: 'none' }} />
            )}

            {/* Logout Modal */}
            {showLogout && (
                <LogoutModal
                    onConfirm={handleLogout}
                    onCancel={() => setShowLogout(false)}
                />
            )}
        </>
    );
};

export default Sidebar;
