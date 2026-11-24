import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    Settings,
    LogOut,
    MessageSquare,
    FileText,
    MessageCircle,
    ShoppingBag,
    Truck,
    Star
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const AdminSidebar: React.FC = () => {
    const handleLogout = async () => {
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000));
            await Promise.race([supabase.auth.signOut({ scope: 'local' }), timeoutPromise]);
        } catch (error: any) {
            console.error('Logout error:', error);
        } finally {
            window.location.href = '/admin/login';
        }
    };

    const navItems: Array<{ name: string; icon: React.ReactNode; path: string; badge?: string }> = [
        { name: '대시보드', icon: <LayoutDashboard size={20} />, path: '/admin' },
        { name: '결제 / 단건주문 관리', icon: <CreditCard size={20} />, path: '/admin/payments' },
        { name: '심층 리포트 관리', icon: <FileText size={20} />, path: '/admin/deep-reports' },
        { name: '카톡 1:1 상담 관리', icon: <MessageSquare size={20} />, path: '/admin/consultations' },
        { name: '고객 문의 / 환불', icon: <MessageCircle size={20} />, path: '/admin/inquiries' },
        { name: '사용자 리뷰 관리', icon: <Star size={20} />, path: '/admin/reviews' },
        { name: '회원 관리', icon: <Users size={20} />, path: '/admin/users' },
        { name: '단가 / 운영 정책', icon: <Settings size={20} />, path: '/admin/plans' },
        { name: '쇼핑몰 상품 관리', icon: <ShoppingBag size={20} />, path: '/admin/shop/products', badge: '준비중' },
        { name: '쇼핑몰 주문/배송', icon: <Truck size={20} />, path: '/admin/shop/orders', badge: '준비중' },
    ];

    return (
        <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-50">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-black text-white tracking-tight">MBTIJU <span className="text-slate-400">ADMIN</span></h1>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        className={({ isActive }) =>
                            `flex items-center justify-between gap-2 px-4 py-3 rounded-xl transition-all font-medium ${isActive
                                ? 'bg-white text-slate-900 shadow-lg shadow-black/20'
                                : 'hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        <span className="flex items-center gap-3 min-w-0">
                            {item.icon}
                            <span className="truncate">{item.name}</span>
                        </span>
                        {item.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 shrink-0">
                                {item.badge}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all font-medium"
                >
                    <LogOut size={20} />
                    로그아웃
                </button>
            </div>
        </div>
    );
};

export default AdminSidebar;
