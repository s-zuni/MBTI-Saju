import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, AlertCircle } from 'lucide-react';


const PaymentFail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const code = searchParams.get('code');
    const message = searchParams.get('message');
    const orderId = searchParams.get('orderId');

    return (
        <div className="min-h-screen bg-slate-50 pt-14 md:pt-20 pb-24 flex flex-col items-center justify-center px-4">


            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full text-center animate-fade-in">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-8 h-8 text-rose-500" />
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-2">결제에 실패했습니다</h2>
                <p className="text-slate-500 mb-8">요청하신 결제 처리를 완료할 수 없었습니다.</p>

                <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left space-y-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-slate-400 mb-0.5">실패 사유</p>
                            <p className="text-sm font-bold text-slate-700 leading-tight">
                                {message || '알 수 없는 오류가 발생했습니다.'}
                            </p>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-400 mb-0.5">주문 번호</p>
                        <p className="text-sm font-mono text-slate-500">{orderId || '-'}</p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">에러 코드</p>
                        <p className="text-sm font-bold text-indigo-400 uppercase tracking-wider">{code || 'UNKNOWN_ERROR'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="py-3.5 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                        홈으로
                    </button>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="btn-primary py-3.5 px-4 text-sm"
                    >
                        다시 시도하기
                    </button>
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    계속해서 문제가 발생하면 고객센터(070-8095-3075)로 문의해주세요.
                </p>
            </div>
        </div>
    );
};

export default PaymentFail;
