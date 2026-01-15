import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import MobileHeader from '../components/MobileHeader';
import { Plus, Trash2, Sparkles, UserPlus, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface RelationshipProfile {
    id: string;
    name: string;
    birthDate: string; // YYYY-MM-DD
    birthTime?: string; // HH:mm
    mbti: string;
    relation: string; // 'friend', 'lover', 'family', 'colleague'
}

const RelationshipPage: React.FC = () => {
    // const navigate = useNavigate();
    const [profiles, setProfiles] = useState<RelationshipProfile[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    // const [loading, setLoading] = useState(true);

    // Form State
    const [newName, setNewName] = useState('');
    const [newBirthDate, setNewBirthDate] = useState('');
    const [newMbti, setNewMbti] = useState('ISTJ');
    const [newRelation, setNewRelation] = useState('friend');

    // Daily Chemistry State
    const [dailyChemistry, setDailyChemistry] = useState<any[] | null>(null);
    const [chemistryLoading, setChemistryLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        // Load from LocalStorage
        const saved = localStorage.getItem('relationship_profiles');
        if (saved) {
            setProfiles(JSON.parse(saved));
        }

        // Fetch User Profile
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserProfile({
                    name: session.user.user_metadata.full_name || '나',
                    birthDate: session.user.user_metadata.birth_date,
                    mbti: session.user.user_metadata.mbti || 'INFJ' // Fallback
                });
            }
        };
        fetchUser();
        // setLoading(false);
    }, []);

    const saveProfiles = (newProfiles: RelationshipProfile[]) => {
        setProfiles(newProfiles);
        localStorage.setItem('relationship_profiles', JSON.stringify(newProfiles));
    };

    const handleAddProfile = (e: React.FormEvent) => {
        e.preventDefault();
        const newProfile: RelationshipProfile = {
            id: Date.now().toString(),
            name: newName,
            birthDate: newBirthDate,
            mbti: newMbti,
            relation: newRelation,
        };
        saveProfiles([...profiles, newProfile]);
        setShowAddForm(false);
        // Reset form
        setNewName('');
        setNewBirthDate('');
        setNewMbti('ISTJ');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            saveProfiles(profiles.filter(p => p.id !== id));
        }
    };

    const handleCheckDaily = async () => {
        if (!userProfile) {
            alert('로그인이 필요합니다.');
            return;
        }
        setChemistryLoading(true);
        try {
            const response = await fetch('/api/daily_relationship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    myProfile: userProfile,
                    partners: profiles
                })
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            setDailyChemistry(data);
        } catch (e) {
            console.error(e);
            alert('분석 중 오류가 발생했습니다.');
        } finally {
            setChemistryLoading(false);
        }
    };

    const getPartnerResult = (id: string) => {
        return dailyChemistry?.find((r: any) => r.id === id);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 pt-14 md:pt-20 animate-fade-in">
            <MobileHeader title="인연 도감" />

            <div className="max-w-3xl mx-auto px-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 hidden md:block">인연 도감</h1>
                        <p className="text-slate-500 text-sm mt-1">내 소중한 사람들과의 매일매일 달라지는 기운을 확인하세요.</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        인연 추가
                    </button>
                </div>

                {/* Daily Action Card */}
                {profiles.length > 0 && (
                    <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl p-6 text-white text-center shadow-xl shadow-pink-200 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">오늘의 인연 기운 확인하기</h2>
                            <p className="text-pink-100 text-sm mb-6 max-w-xs mx-auto">
                                등록된 {profiles.length}명의 친구들과 오늘 어떤 케미가 있을까요?
                                <br />매일 아침 확인해보세요!
                            </p>
                            {!dailyChemistry ? (
                                <button
                                    onClick={handleCheckDaily}
                                    disabled={chemistryLoading}
                                    className="bg-white text-pink-600 px-8 py-3 rounded-xl font-bold hover:bg-pink-50 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {chemistryLoading ? '분석 중...' : '지금 분석하기'}
                                </button>
                            ) : (
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                                    <p className="font-bold">✨ 오늘의 분석이 완료되었습니다!</p>
                                    <p className="text-xs opacity-80 mt-1">아래 리스트에서 각 인연의 코멘트를 확인하세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Relationship List */}
                {profiles.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserPlus className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">아직 등록된 인연이 없어요</h3>
                        <p className="text-slate-400 text-sm mb-6">친구, 연인, 가족을 등록하고<br />매일 달라지는 궁합을 확인해보세요.</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="text-indigo-600 font-bold text-sm hover:underline"
                        >
                            + 첫 번째 인연 등록하기
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {profiles.map((profile) => {
                            const result = getPartnerResult(profile.id);
                            return (
                                <div key={profile.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-colors hover:border-indigo-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                                                ${profile.relation === 'lover' ? 'bg-pink-100 text-pink-600' :
                                                    profile.relation === 'family' ? 'bg-green-100 text-green-600' :
                                                        'bg-indigo-100 text-indigo-600'}
                                            `}>
                                                {profile.name[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-900">{profile.name}</h3>
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium border border-slate-200">
                                                        {profile.mbti}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {profile.birthDate}
                                                    <span className="mx-1">•</span>
                                                    {profile.relation === 'lover' ? '연인' :
                                                        profile.relation === 'family' ? '가족' :
                                                            profile.relation === 'colleague' ? '동료' : '친구'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(profile.id)}
                                            className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Result Section */}
                                    {result && (
                                        <div className="mt-4 pt-4 border-t border-slate-50 animate-fade-in relative">
                                            <div className="flex items-start gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="text-xl font-bold text-indigo-600">{result.score}점</div>
                                                </div>
                                                <p className="text-sm text-slate-700 leading-snug bg-indigo-50/50 p-2.5 rounded-lg w-full">
                                                    <span className="mr-1">💌</span> {result.msg}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Modal (Simple Overlay) */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-up">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">새로운 인연 추가</h2>
                        <form onSubmit={handleAddProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">이름</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="이름을 입력하세요"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">생년월일</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newBirthDate}
                                    onChange={e => setNewBirthDate(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">MBTI</label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={newMbti}
                                        onChange={e => setNewMbti(e.target.value)}
                                    >
                                        {['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">관계</label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={newRelation}
                                        onChange={e => setNewRelation(e.target.value)}
                                    >
                                        <option value="friend">친구</option>
                                        <option value="lover">연인</option>
                                        <option value="family">가족</option>
                                        <option value="colleague">동료</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-colors"
                                >
                                    추가하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelationshipPage;
