import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface MobileHeaderProps {
    title?: string;
    onBack?: () => void;
    className?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ title, onBack, className = '' }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className={`md:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md z-40 flex items-center px-4 border-b border-slate-100 ${className}`}>
            <button
                onClick={handleBack}
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {title && (
                <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-slate-800">
                    {title}
                </h1>
            )}
        </div>
    );
};

export default MobileHeader;
