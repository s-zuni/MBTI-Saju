import React from 'react';
import { Coins } from 'lucide-react';

interface CoinDisplayProps {
    coins: number;
    loading?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    showAddButton?: boolean;
}

const CoinDisplay: React.FC<CoinDisplayProps> = ({
    coins,
    loading = false,
    onClick,
    size = 'md',
    showAddButton = true
}) => {
    const sizeClasses = {
        sm: 'text-xs px-2 py-1 gap-1',
        md: 'text-sm px-3 py-1.5 gap-1.5',
        lg: 'text-base px-4 py-2 gap-2'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`
        inline-flex items-center ${sizeClasses[size]}
        bg-gradient-to-r from-amber-400 to-orange-500 
        text-white font-bold rounded-full
        shadow-lg shadow-amber-500/30
        transition-all duration-200
        ${onClick ? 'hover:scale-105 hover:shadow-amber-500/50 cursor-pointer' : 'cursor-default'}
        ${loading ? 'opacity-70 animate-pulse' : ''}
      `}
        >
            <Coins className={`${iconSizes[size]} ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '...' : coins.toLocaleString()}</span>
            {showAddButton && onClick && (
                <span className="ml-0.5 text-amber-100">+</span>
            )}
        </button>
    );
};

export default CoinDisplay;
