import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Search,
    Edit2,
    Coins,
    User as UserIcon,
    Loader2,
    X,
    Check
} from 'lucide-react';

interface Profile {
    id: string;
    name: string;
    email: string;
    coins: number;
    role: string;
    created_at: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [newCoins, setNewCoins] = useState<number>(0);
    const [newRole, setNewRole] = useState<string>('user');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    coins: newCoins,
                    role: newRole
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            alert('사용자 정보가 수정되었습니다.');
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const filteredUsers = users.filter(u => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search);
    });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">회원 관리</h2>
                    <p className="text-slate-500 font-medium">사용자 목록을 조회하고 정보를 수정합니다.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="이름 또는 이메일 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all w-64 font-medium"
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">사용자</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">보유 코인</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">권한</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">가입일</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-400">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">검색 결과가 없습니다.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                    <UserIcon size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{user.name || '미설정'}</div>
                                                    <div className="text-xs font-medium text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                <Coins size={16} className="text-amber-500" />
                                                {user.coins?.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-tight ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {user.role === 'admin' ? 'ADMIN' : 'USER'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setNewCoins(user.coins || 0);
                                                        setNewRole(user.role || 'user');
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">사용자 정보 수정</h3>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                    <UserIcon size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800">{editingUser.name}</div>
                                    <div className="text-xs font-medium text-slate-400">{editingUser.email}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 ml-1">보유 코인</label>
                                <div className="relative">
                                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="number"
                                        value={newCoins}
                                        onChange={(e) => setNewCoins(parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 border-none pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 ml-1">권한 설정</label>
                                <div className="flex gap-2">
                                    {['user', 'admin'].map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => setNewRole(role)}
                                            className={`flex-1 py-3 rounded-2xl font-bold transition-all ${newRole === role
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                }`}
                                        >
                                            {role.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 py-4 bg-slate-50 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                            >
                                <Check size={20} />
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
