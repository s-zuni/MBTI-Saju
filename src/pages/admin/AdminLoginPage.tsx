import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // If already logged in as admin, skip login
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.role === 'admin') {
                    navigate('/admin');
                }
            }
        };
        checkSession();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (session) {
                const { data: profile, error: dbError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (dbError) {
                    await supabase.auth.signOut();
                    throw new Error(`데이터베이스 오류: ${dbError.message}`);
                }

                if (profile?.role !== 'admin') {
                    await supabase.auth.signOut();
                    alert(`관리자 권한이 없습니다. (현재 역할: ${profile?.role || '없음'})`);
                    navigate('/');
                    return;
                }

                navigate('/admin');
            }
        } catch (err: any) {
            alert(err.message || '로그인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <button
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 transition-colors font-medium"
            >
                <ArrowLeft size={18} />
                메인으로 돌아가기
            </button>

            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-6 shadow-xl shadow-black/40">
                        <Lock className="text-slate-950" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">ADMIN LOGIN</h1>
                    <p className="text-slate-400 font-medium tracking-wide">관리자 계정으로 로그인해 주세요</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 ml-1">이메일</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all outline-none font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 ml-1">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all outline-none font-medium"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-lg shadow-black/30 flex items-center justify-center gap-2 mt-4 text-lg active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin text-slate-950" size={24} /> : '로그인'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginPage;
