import React from 'react';
import { ShoppingBag, Star } from 'lucide-react';
import { Product } from '../utils/paymentHandlers';

interface ProductCardProps {
    product: Product;
    onBuy: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onBuy }) => {
    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
            <div className="relative h-48 bg-slate-100 overflow-hidden group">
                <img
                    src={product.image_url || 'https://via.placeholder.com/300'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-indigo-600 border border-indigo-100 shadow-sm flex items-center gap-1">
                    <Star className="w-3 h-3 fill-indigo-600" />
                    {product.type === 'digital' ? 'Digital' : 'Goods'}
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{product.name}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow">{product.description}</p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <span className="text-lg font-bold text-slate-800">
                        ₩{product.price.toLocaleString()}
                    </span>
                    <button
                        onClick={() => onBuy(product)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        구매하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
