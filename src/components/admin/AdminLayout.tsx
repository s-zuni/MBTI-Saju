import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../../supabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const AdminLayout: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    const { session, loading: isAuthLoading } = useAuth();

    useEffect(() => {
        const checkAdmin = async () => {
            // Failsafe timeout
            const timeoutId = setTimeout(() => {
                if (loading) setLoading(false);
            }, 5000);

            try {
                if (isAuthLoading) return;

                if (!session) {
                    navigate('/admin/login');
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (error || profile?.role !== 'admin') {
                    setIsAdmin(false);
                    alert('관리자 권한이 없습니다.');
                    navigate('/');
                    return;
                }

                setIsAdmin(true);
            } catch (err) {
                console.error("Admin check failed", err);
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };

        checkAdmin();
    }, [navigate, session, isAuthLoading]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">관리자 권한 확인 중...</p>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar />
            <div className="flex-1 ml-64 p-8">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
