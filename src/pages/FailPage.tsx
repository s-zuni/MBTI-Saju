import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';


export default function FailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const errorCode = searchParams.get('code');
    const errorMessage = searchParams.get('message');

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-14 md:pt-20">

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
                    <div className="flex flex-col items-center gap-4">
                        <XCircle className="w-16 h-16 text-red-500" />
                        <h2 className="text-xl font-bold text-slate-800">결제를 완료하지 못했습니다</h2>
                        <div className="text-slate-500 text-sm mb-4 bg-red-50 p-3 flex flex-col rounded-lg">
                            <span className="font-semibold text-red-600 mb-1">에러: {errorCode || 'UNKNOWN_ERROR'}</span>
                            <span>{errorMessage || '사용자가 결제를 취소했거나 승인 과정에서 문제가 발생했습니다.'}</span>
                        </div>
                        <button
                            onClick={() => navigate('/store')}
                            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                        >
                            상점으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
