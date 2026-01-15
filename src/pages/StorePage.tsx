import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import { Product, requestPayment } from '../utils/paymentHandlers';
import { ShoppingBag, AlertCircle, Loader2 } from 'lucide-react';
// import Navbar from '../components/Navbar';
// import Footer from '../components/Footer';
import MobileHeader from '../components/MobileHeader';

const StorePage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

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

        try {
            const { success, error_msg, imp_uid } = await requestPayment({
                name: product.name,
                amount: product.price,
                buyer_email: user.email,
                buyer_name: user.user_metadata?.full_name || 'User',
            });

            if (success && imp_uid) {
                // Save Order to Supabase
                const { error } = await supabase.from('orders').insert({
                    user_id: user.id,
                    product_id: product.id,
                    payment_id: imp_uid,
                    amount: product.price,
                    status: 'paid'
                });

                if (error) {
                    console.error("Order save failed", error);
                    alert(`결제는 성공했으나 주문 저장에 실패했습니다. 관리자에게 문의하세요. (${imp_uid})`);
                } else {
                    alert(`결제가 완료되었습니다! (주문번호: ${imp_uid})\n곧 마이페이지에서 확인하실 수 있습니다.`);
                    // TODO: Refresh order history or redirect to MyPage
                }
            } else {
                alert(`결제 실패: ${error_msg}`);
            }
        } catch (e) {
            console.error(e);
            alert("결제 처리 중 오류가 발생했습니다.");
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
        </div>
    );
};

export default StorePage;
