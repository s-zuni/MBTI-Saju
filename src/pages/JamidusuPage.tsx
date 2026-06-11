import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ChevronLeft, Coins, Lock, Star } from 'lucide-react';
import html2canvas from 'html2canvas';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { jamidusuSchema } from '../config/schemas';
import { SERVICE_COSTS } from '../config/creditConfig';
import { calculateSaju } from '../utils/sajuUtils';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useModalStore } from '../hooks/useModalStore';

const BIRTH_TIME_SLOTS = [
    { value: 'unknown', label: '모름' },
    { value: '01:00-03:00', label: '축시 (01:00~03:00)' },
    { value: '03:00-05:00', label: '인시 (03:00~05:00)' },
    { value: '05:00-07:00', label: '묘시 (05:00~07:00)' },
    { value: '07:00-09:00', label: '진시 (07:00~09:00)' },
    { value: '09:00-11:00', label: '사시 (09:00~11:00)' },
    { value: '11:00-13:00', label: '오시 (11:00~13:00)' },
    { value: '13:00-15:00', label: '미시 (13:00~15:00)' },
    { value: '15:00-17:00', label: '신시 (15:00~17:00)' },
    { value: '17:00-19:00', label: '유시 (17:00~19:00)' },
    { value: '19:00-21:00', label: '술시 (19:00~21:00)' },
    { value: '21:00-23:00', label: '해시 (21:00~23:00)' },
];

const JamidusuPage: React.FC = () => {
    const { session, loading: isAuthLoading } = useAuth();
    const { credits, useCredits: consumeCredits } = useCredits(session);
    const { openModal } = useModalStore();
    const navigate = useNavigate();
    const resultCardRef = useRef<HTMLDivElement>(null);

    const [error, setError] = useState<string | null>(null);
    const [targetBirthDate, setTargetBirthDate] = useState('');
    const [targetBirthTime, setTargetBirthTime] = useState('');
    const [targetGender, setTargetGender] = useState<'male' | 'female'>('female');

    useEffect(() => {
        if (session?.user?.user_metadata) {
            const metadata = session.user.user_metadata;
            if (metadata.birth_date) setTargetBirthDate(metadata.birth_date);
            if (metadata.birth_time) setTargetBirthTime(metadata.birth_time);
            if (metadata.gender === 'male' || metadata.gender === 'female') setTargetGender(metadata.gender);
        }
    }, [session]);

    const { object: result, submit, isLoading } = useObject({
        api: '/api/analysis-special',
        schema: jamidusuSchema,
        headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetBirthDate) {
            alert('생년월일을 입력해주세요.');
            return;
        }

        const cost = SERVICE_COSTS.JAMIDUSU;
        if (credits !== undefined && credits < cost) {
            openModal('creditPurchase', undefined, { requiredCredits: cost });
            return;
        }

        try {
            setError(null);
            const sajuData = calculateSaju(targetBirthDate, targetBirthTime);
            submit({
                type: 'jamidusu',
                gender: targetGender,
                birthDate: targetBirthDate,
                birthTime: targetBirthTime,
                sajuData
            });
            await consumeCredits('JAMIDUSU');
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSaveImage = async () => {
        if (!resultCardRef.current || !result) return;
        try {
            const canvas = await html2canvas(resultCardRef.current, {
                scale: 2, // High resolution for Instagram
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `자미두수_명반_${new Date().getTime()}.png`;
            link.href = image;
            link.click();
        } catch (err) {
            alert('이미지 저장 중 오류가 발생했습니다.');
        }
    };

    if (isAuthLoading) return null;
    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">로그인이 필요합니다</h2>
                <p className="text-slate-500 mb-8">자미두수 분석 서비스를 이용하시려면 로그인이 필요합니다.</p>
                <button
                    onClick={() => {
                        navigate('/');
                        setTimeout(() => openModal('analysis', 'login'), 100);
                    }}
                    className="px-8 py-4 bg-slate-900 text-white rounded-xl shadow hover:bg-indigo-600 transition-colors"
                >
                    로그인하고 시작하기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32 pt-20">
            <div className="max-w-xl mx-auto px-4">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8 px-2">
                    <button 
                        onClick={() => navigate('/fortune')}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                        <Coins className="w-4 h-4" />
                        {credits}
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 text-center bg-gradient-to-br from-indigo-50 to-purple-50">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm mb-4">
                            <Star className="w-6 h-6 text-indigo-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">자미두수</h1>
                        <p className="text-slate-500 text-sm">운명 분석의 최고봉, 12궁 정통 자미두수</p>
                    </div>

                    <div className="p-8">
                        {!result && !isLoading ? (
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-700">성별</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setTargetGender('female')} 
                                            className={`py-4 rounded-xl text-base transition-colors ${targetGender === 'female' ? 'bg-indigo-600 text-white font-bold shadow' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            여성
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setTargetGender('male')} 
                                            className={`py-4 rounded-xl text-base transition-colors ${targetGender === 'male' ? 'bg-indigo-600 text-white font-bold shadow' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            남성
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-700">생년월일</label>
                                    <input 
                                        type="date" 
                                        value={targetBirthDate} 
                                        onChange={(e) => setTargetBirthDate(e.target.value)} 
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-700">태어난 시간 (선택사항)</label>
                                    <select 
                                        value={targetBirthTime} 
                                        onChange={(e) => setTargetBirthTime(e.target.value)} 
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">시간을 선택해주세요 (모르면 선택 안함)</option>
                                        {BIRTH_TIME_SLOTS.map((slot) => (
                                            <option key={slot.value} value={slot.value}>{slot.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full py-5 bg-slate-900 text-white rounded-xl font-bold text-lg shadow hover:bg-indigo-600 transition-colors flex flex-col items-center justify-center gap-1"
                                >
                                    <span>결과 확인하기</span>
                                    <span className="text-xs text-indigo-300 font-normal">{SERVICE_COSTS.JAMIDUSU} 크레딧 차감</span>
                                </button>
                            </form>
                        ) : (
                            <div>
                                {isLoading && !result ? (
                                    <div className="flex flex-col justify-center items-center py-20 text-center">
                                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                                        <p className="text-slate-800 font-medium text-lg">자미두수 12궁 명반을 세우는 중...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-16">
                                        <p className="text-red-500 mb-6 font-medium">분석 중 오류가 발생했습니다.</p>
                                        <button 
                                            onClick={() => window.location.reload()} 
                                            className="px-8 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                        >
                                            다시 시도하기
                                        </button>
                                    </div>
                                ) : result ? (
                                    <div className="space-y-8">
                                        {/* Result Card for Instagram Sharing */}
                                        <div 
                                            ref={resultCardRef} 
                                            className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm relative overflow-hidden"
                                        >
                                            {/* Decorative Background Element */}
                                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                                            
                                            <div className="relative z-10">
                                                <div className="text-center mb-8">
                                                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold mb-4">자미두수 12궁 분석 결과</span>
                                                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                                                        {result.main_character || '분석 중...'}
                                                    </h2>
                                                </div>

                                                <div className="space-y-6">
                                                    {result.palaces && result.palaces.length > 0 && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {result.palaces.map((palace: any, idx: number) => (
                                                                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
                                                                    <div className="flex items-start justify-between mb-3 gap-2">
                                                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                                                                            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black shadow-sm border border-indigo-200">{palace.name.substring(0, 1)}</span>
                                                                            {palace.name}
                                                                        </h3>
                                                                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 text-right">{palace.stars}</span>
                                                                    </div>
                                                                    <p className="text-slate-600 text-sm leading-relaxed break-keep whitespace-pre-line mt-2">{palace.analysis}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {result.summary && (
                                                        <div className="text-center pt-4 border-t border-slate-100">
                                                            <p className="text-indigo-600 font-medium text-sm break-keep">"{result.summary}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button 
                                                onClick={handleSaveImage} 
                                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-5 h-5" /> 결과 이미지 저장
                                            </button>
                                            <button 
                                                onClick={() => window.location.reload()} 
                                                className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                            >
                                                다시하기
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JamidusuPage;
