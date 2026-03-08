import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const StorePage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        alert("운세템 상점은 현재 준비 중입니다. 메인 페이지로 이동합니다.");
        navigate('/');
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="mt-4 text-slate-600 font-medium">페이지 이동 중...</p>
        </div>
    );
};

export default StorePage;
