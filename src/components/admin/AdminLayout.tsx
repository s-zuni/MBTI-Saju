import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../../supabaseClient';
import { Loader2 } from 'lucide-react';

const AdminLayout: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();

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
                setLoading(false);
                alert('관리자 권한이 없습니다.');
                navigate('/');
                return;
            }

            setIsAdmin(true);
            setLoading(false);
        };

        checkAdmin();
    }, [navigate]);

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
