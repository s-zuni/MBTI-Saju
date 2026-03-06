import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import { Product } from '../utils/paymentHandlers';
import { ShoppingBag, AlertCircle, Loader2, X } from 'lucide-react';
import MobileHeader from '../components/MobileHeader';
import { loadTossPayments, TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { v4 as uuidv4 } from 'uuid';

const StorePage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    // Toss Payments Widget State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
    const [isWidgetLoading, setIsWidgetLoading] = useState(false);

    useEffect(() => {
        fetchProducts();
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setProducts(data);
            } else {
                // Fallback Mock Data if DB is empty (for demo/development)
                setProducts([
                    {
                        id: 'mock-1',
                        name: '재물운 상승 황금 두꺼비',
                        description: '재물을 불러오는 황금 두꺼비 디지털 부적입니다. 스마트폰 배경화면으로 사용하세요.',
                        price: 1000,
                        image_url: 'https://images.unsplash.com/photo-1620325493368-24328ce78bf2?q=80&w=300&auto=format&fit=crop',
                        type: 'digital'
                    },
                    {
                        id: 'mock-2',
                        name: '연애운 급상승 복숭아꽃',
                        description: '사랑을 부르는 핑크빛 복숭아꽃 부적입니다. 짝사랑 성공 기원!',
                        price: 1500,
                        image_url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?q=80&w=300&auto=format&fit=crop',
                        type: 'digital'
                    },
                    {
                        id: 'mock-3',
                        name: '만사형통 부적',
                        description: '모든 일이 술술 풀리는 만사형통 부적입니다.',
                        price: 500,
                        image_url: 'https://images.unsplash.com/photo-1628151016008-6e542af1e2a0?q=80&w=300&auto=format&fit=crop',
                        type: 'digital'
                    }
                ]);
            }
        } catch (err: any) {
            console.error('Error fetching products:', err);
            setError('상품을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (product: Product) => {
        if (!user) {
            alert("로그인이 필요한 서비스입니다.");
            return;
        }

        setSelectedProduct(product);
        setPaymentModalOpen(true);
    };

    // Initialize Toss Payments Widget
    useEffect(() => {
        const initWidgets = async () => {
            if (!paymentModalOpen || !selectedProduct || !user) return;

            setIsWidgetLoading(true);
            try {
                // Client Key (Replace with your actual client key from Toss Payments)
                const clientKey = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_mBZ1gQ4YVXbxv27PnmDqrLW2K0np';
                const tossPayments = await loadTossPayments(clientKey);

                // Construct customer key (unique per user)
                const customerKey = user.id.replace(/[^a-zA-Z0-9_\-:]/g, '').substring(0, 50);

                const widgets = tossPayments.widgets({
                    customerKey,
                });

                await widgets.setAmount({
                    currency: 'KRW',
                    value: selectedProduct.price,
                });

                await Promise.all([
                    widgets.renderPaymentMethods({
                        selector: '#payment-method',
                        variantKey: 'DEFAULT',
                    }),
                    widgets.renderAgreement({
                        selector: '#agreement',
                        variantKey: 'AGREEMENT',
                    }),
                ]);

                setWidgets(widgets);
            } catch (error) {
                console.error('Error rendering payment widget:', error);
                alert('결제 위젯을 불러오는 중 오류가 발생했습니다.');
            } finally {
                setIsWidgetLoading(false);
            }
        };

        if (paymentModalOpen) {
            initWidgets();
        } else {
            setWidgets(null); // Clear widgets on close
        }
    }, [paymentModalOpen, selectedProduct, user]);

    const requestPayment = async () => {
        if (!widgets || !selectedProduct) return;

        try {
            const orderId = `${uuidv4().replace(/-/g, '')}`.substring(0, 64);

            await widgets.requestPayment({
                orderId: orderId,
                orderName: selectedProduct.name,
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
                customerEmail: user.email,
                customerName: user.user_metadata?.full_name || 'MBTIJU User',
                // Metadata to identify the user and product in the backend confirm endpoint
                metadata: {
                    userId: user.id,
                    productId: selectedProduct.id,
                }
            });
        } catch (error: any) {
            console.error('Payment request error:', error);
            if (error.code === 'USER_CANCEL') {
                setPaymentModalOpen(false);
            } else {
                alert(`결제 요청 실패: ${error.message || '알 수 없는 오류'}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 pt-14 md:pt-20 animate-fade-in">
            <MobileHeader title="운세템 상점" />

            {/* Header Area - Hidden on Mobile to avoid dupes with MobileHeader, or keep specific desktop style */}
            <div className="hidden md:block bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <ShoppingBag className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">운세템 상점</h1>
                    </div>
                    <p className="text-slate-500 pl-11">나의 운명을 바꿔줄 신비로운 아이템을 만나보세요.</p>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p>{error}</p>
                        <button onClick={fetchProducts} className="text-indigo-600 underline text-sm hover:text-indigo-700">다시 시도하기</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} onBuy={handleBuy} />
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {paymentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">결제하기</h3>
                            <button
                                onClick={() => setPaymentModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
                            {/* Product Summary */}
                            {selectedProduct && (
                                <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center overflow-hidden">
                                            {selectedProduct.image_url ? (
                                                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <ShoppingBag className="w-6 h-6 text-indigo-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{selectedProduct.name}</p>
                                            <p className="text-sm text-slate-500">{selectedProduct.price.toLocaleString()}원</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Widget Containers */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                                <div id="payment-method" className="w-full" />
                                <div id="agreement" className="w-full" />
                            </div>

                            {/* Payment Button */}
                            <div className="mt-4">
                                <button
                                    onClick={requestPayment}
                                    disabled={!widgets || isWidgetLoading}
                                    className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex justify-center items-center"
                                >
                                    {isWidgetLoading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        `${selectedProduct?.price.toLocaleString()}원 결제하기`
                                    )}
                                </button>
                                <p className="text-center text-slate-400 text-xs mt-3">
                                    결제 시 이용약관 및 개인정보 취급방침에 동의한 것으로 간주합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StorePage;
