import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Plus,
    Pencil,
    Trash2,
    Package,
    Image as ImageIcon,
    Loader2,
    X,
    Check,
    ToggleLeft,
    ToggleRight,
    Upload
} from 'lucide-react';

interface ShopProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    product_type: 'physical' | 'digital';
    thumbnail_url: string | null;
    images: string[];
    is_active: boolean;
    created_at: string;
}

const AdminShopProducts: React.FC = () => {
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [stock, setStock] = useState<number>(0);
    const [productType, setProductType] = useState<'physical' | 'digital'>('physical');
    const [isActive, setIsActive] = useState(true);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [detailFiles, setDetailFiles] = useState<File[]>([]);
    const [detailPreviews, setDetailPreviews] = useState<string[]>([]);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    
    const [saving, setSaving] = useState(false);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shop_products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts().catch(err => console.error(err));
    }, [fetchProducts]);

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setName('');
        setDescription('');
        setPrice(0);
        setStock(0);
        setProductType('physical');
        setIsActive(true);
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setDetailFiles([]);
        setDetailPreviews([]);
        setExistingThumbnailUrl(null);
        setExistingImages([]);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (product: ShopProduct) => {
        setEditingProduct(product);
        setName(product.name);
        setDescription(product.description || '');
        setPrice(product.price);
        setStock(product.stock);
        setProductType(product.product_type);
        setIsActive(product.is_active);
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setDetailFiles([]);
        setDetailPreviews([]);
        setExistingThumbnailUrl(product.thumbnail_url);
        setExistingImages(product.images || []);
        setIsModalOpen(true);
    };

    const uploadImage = async (file: File, folder: string): Promise<string | null> => {
        const fileName = `${folder}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('shop-images').upload(fileName, file);
        if (error) {
            console.error('Upload error:', error);
            return null;
        }
        const { data: urlData } = supabase.storage.from('shop-images').getPublicUrl(fileName);
        return urlData.publicUrl;
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setDetailFiles(prev => [...prev, ...filesArray]);
            const newPreviews = filesArray.map(file => URL.createObjectURL(file));
            setDetailPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeNewDetailImage = (index: number) => {
        setDetailFiles(prev => prev.filter((_, i) => i !== index));
        setDetailPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingDetailImage = (url: string) => {
        setExistingImages(prev => prev.filter(item => item !== url));
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);

            // Upload thumbnail if changed
            let finalThumbnailUrl = existingThumbnailUrl;
            if (thumbnailFile) {
                const uploadedUrl = await uploadImage(thumbnailFile, 'thumbnails');
                if (uploadedUrl) finalThumbnailUrl = uploadedUrl;
            }

            // Upload detailed images
            const uploadedDetailUrls: string[] = [];
            for (const file of detailFiles) {
                const url = await uploadImage(file, 'details');
                if (url) uploadedDetailUrls.push(url);
            }

            const finalImages = [...existingImages, ...uploadedDetailUrls];

            const productData = {
                name,
                description,
                price,
                stock,
                product_type: productType,
                thumbnail_url: finalThumbnailUrl,
                images: finalImages,
                is_active: isActive,
                updated_at: new Date().toISOString()
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from('shop_products')
                    .update(productData)
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('shop_products')
                    .insert(productData);
                if (error) throw error;
            }

            setIsModalOpen(false);
            await fetchProducts();
        } catch (err) {
            console.error('Error saving product:', err);
            alert('상품 저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!window.confirm('정말 이 상품을 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase
                .from('shop_products')
                .delete()
                .eq('id', productId);
            if (error) throw error;
            await fetchProducts();
        } catch (err) {
            console.error('Error deleting product:', err);
            alert('상품 삭제에 실패했습니다.');
        }
    };

    const handleToggleActive = async (product: ShopProduct) => {
        try {
            const { error } = await supabase
                .from('shop_products')
                .update({ is_active: !product.is_active })
                .eq('id', product.id);

            if (error) throw error;
            await fetchProducts();
        } catch (err) {
            console.error('Error toggling active state:', err);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <Package className="text-violet-600" />
                            운세템 상품 관리
                        </h1>
                        <p className="text-sm text-slate-500">실물 및 디지털 상품을 등록하고 관리합니다.</p>
                    </div>
                    <button
                        onClick={handleOpenAddModal}
                        className="px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-violet-200 transition-all text-sm"
                    >
                        <Plus size={18} />
                        상품 추가
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-violet-600" size={32} />
                    </div>
                ) : products.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                        <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold">등록된 상품이 없습니다.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-4 px-6">이미지</th>
                                        <th className="py-4 px-6">상품명</th>
                                        <th className="py-4 px-6">가격</th>
                                        <th className="py-4 px-6">재고</th>
                                        <th className="py-4 px-6">유형</th>
                                        <th className="py-4 px-6 text-center">노출 여부</th>
                                        <th className="py-4 px-6 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {products.map(product => (
                                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                {product.thumbnail_url ? (
                                                    <img
                                                        src={product.thumbnail_url}
                                                        alt={product.name}
                                                        className="w-12 h-12 object-cover rounded-xl border border-slate-100"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                                        <ImageIcon size={18} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900">{product.name}</td>
                                            <td className="py-4 px-6 font-semibold">₩{product.price.toLocaleString()}</td>
                                            <td className="py-4 px-6">
                                                <span className={`font-semibold ${product.stock === 0 ? 'text-red-500 font-bold' : ''}`}>
                                                    {product.stock.toLocaleString()}개
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    product.product_type === 'physical'
                                                        ? 'bg-blue-50 text-blue-600'
                                                        : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                    {product.product_type === 'physical' ? '실물상품' : '디지털상품'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => handleToggleActive(product)}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors inline-block"
                                                >
                                                    {product.is_active ? (
                                                        <ToggleRight className="text-violet-600" size={32} />
                                                    ) : (
                                                        <ToggleLeft className="text-slate-300" size={32} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-right space-x-2">
                                                <button
                                                    onClick={() => handleOpenEditModal(product)}
                                                    className="p-2 bg-slate-50 hover:bg-violet-50 text-slate-600 hover:text-violet-600 rounded-xl transition-colors inline-flex"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="p-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl transition-colors inline-flex"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-800">
                                {editingProduct ? '상품 수정하기' : '새 상품 등록하기'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">상품명</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">상품 설명</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">판매 가격 (KRW)</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={price}
                                        onChange={e => setPrice(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">재고 수량</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={stock}
                                        onChange={e => setStock(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">상품 유형</label>
                                    <select
                                        value={productType}
                                        onChange={e => setProductType(e.target.value as 'physical' | 'digital')}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-violet-500 font-semibold bg-white"
                                    >
                                        <option value="physical">실물 상품 (배송 필요)</option>
                                        <option value="digital">디지털 상품 (즉시 제공)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-6 pl-4">
                                    <input
                                        type="checkbox"
                                        id="isActiveCheckbox"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                        className="w-5 h-5 rounded text-violet-600 border-slate-200 focus:ring-violet-500"
                                    />
                                    <label htmlFor="isActiveCheckbox" className="text-sm font-bold text-slate-600">
                                        상품 노출 (활성화)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">대표 이미지 (썸네일)</label>
                                <div className="flex items-center gap-4">
                                    <label className="w-24 h-24 border-2 border-dashed border-slate-200 hover:border-violet-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden bg-slate-50">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleThumbnailChange}
                                            className="hidden"
                                        />
                                        {thumbnailPreview ? (
                                            <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : existingThumbnailUrl ? (
                                            <img src={existingThumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-slate-400 flex flex-col items-center">
                                                <Upload size={20} />
                                                <span className="text-[10px] mt-1 font-bold">업로드</span>
                                            </div>
                                        )}
                                    </label>
                                    <p className="text-xs text-slate-400">
                                        권장 해상도: 500x500 픽셀 (1:1 비율)<br />
                                        지원 포맷: JPG, PNG, WEBP (최대 5MB)
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">상세 설명 이미지들</label>
                                <div className="flex flex-wrap gap-3">
                                    {/* Existing Detail Images */}
                                    {existingImages.map((url, idx) => (
                                        <div key={`existing-${idx}`} className="w-20 h-20 rounded-2xl relative border border-slate-100 overflow-hidden">
                                            <img src={url} alt="Detail" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingDetailImage(url)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow transition-colors"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* New Detail Images */}
                                    {detailPreviews.map((previewUrl, idx) => (
                                        <div key={`new-${idx}`} className="w-20 h-20 rounded-2xl relative border border-slate-100 overflow-hidden">
                                            <img src={previewUrl} alt="New Detail Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeNewDetailImage(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow transition-colors"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}

                                    <label className="w-20 h-20 border-2 border-dashed border-slate-200 hover:border-violet-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleDetailsChange}
                                            className="hidden"
                                        />
                                        <Plus size={20} className="text-slate-400" />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-100 flex items-center justify-center gap-2 transition-all"
                                >
                                    {saving ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <Check size={18} />
                                    )}
                                    저장하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminShopProducts;
