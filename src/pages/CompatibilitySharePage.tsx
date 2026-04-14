import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heart, ArrowRight, Loader2 } from 'lucide-react';

const CompatibilitySharePage = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [inviterName, setInviterName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInviter = async () => {
            if (!userId) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', userId)
                    .single();
                
                if (data) setInviterName(data.full_name);
            } catch (err) {
                console.error('Error fetching inviter:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInviter();
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 text-center pb-safe">
            <div className="max-w-md w-full animate-fade-up">
                <div className="relative mb-6 md:mb-8">
                    <div className="absolute inset-0 bg-pink-100 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative bg-white w-20 h-20 md:w-24 md:h-24 rounded-[28px] md:rounded-[32px] shadow-xl shadow-pink-100 flex items-center justify-center mx-auto border border-pink-50">
                        <Heart className="w-10 h-10 md:w-12 md:h-12 text-pink-400 fill-pink-400" />
                    </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 md:mb-4 tracking-tight break-keep leading-tight">
                    {inviterName || '친구'}님이<br />
                    당신을 초대했어요! 💌
                </h1>
                
                <p className="text-sm sm:text-base text-slate-500 font-medium mb-10 md:mb-12 leading-relaxed px-4">
                    {inviterName || '친구'}님과 당신의 운명적인 궁합,<br />
                    사주와 MBTI로 지금 바로 확인해볼까요?
                </p>

                <div className="px-2">
                    <button
                        onClick={() => navigate('/', { state: { openCompatibility: true, inviterId: userId } })}
                        className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-[20px] md:rounded-[24px] font-black text-lg md:text-xl shadow-2xl shadow-slate-200 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        궁합 확인하러 가기
                        <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompatibilitySharePage;
