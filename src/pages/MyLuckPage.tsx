import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Coins, Compass, Moon, Plane, Star, CircleDot, LucideIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';

import TodayFortunePage from './TodayFortunePage';
import TarotPage from './TarotPage';
import TripPage from './TripPage';
import JamidusuPage from './JamidusuPage';
import KboPage from './KboPage';

export type LuckType = 'today' | 'tarot' | 'trip' | 'jamidusu' | 'kbo';

interface TabOption {
  id: LuckType;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const TABS: TabOption[] = [
  { id: 'today', label: '오늘/내일 운세', shortLabel: '오늘/내일', icon: Compass },
  { id: 'tarot', label: '타로', shortLabel: '타로', icon: Moon },
  { id: 'trip', label: '여행', shortLabel: '여행', icon: Plane },
  { id: 'jamidusu', label: '자미두수', shortLabel: '자미두수', icon: Star },
  { id: 'kbo', label: 'KBO 팬궁합', shortLabel: 'KBO 팬궁합', icon: CircleDot },
];

const MyLuckPage: React.FC<{ session?: any }> = ({ session: propSession }) => {
  const { session: hookSession } = useAuth();
  const session = propSession || hookSession;
  const { credits } = useCredits(session);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawType = searchParams.get('type') as LuckType;
  const initialTab = TABS.some((t) => t.id === rawType) ? rawType : 'today';
  const [activeTab, setActiveTab] = useState<LuckType>(initialTab);

  useEffect(() => {
    const type = searchParams.get('type') as LuckType;
    if (type && TABS.some((t) => t.id === type)) {
      setActiveTab(type);
    } else if (!type) {
      setActiveTab('today');
    }
  }, [searchParams]);

  const handleTabChange = (tab: LuckType) => {
    setActiveTab(tab);
    setSearchParams({ type: tab });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 pt-20 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white rounded-full transition-colors border border-slate-100 bg-white/50"
            title="홈으로 이동"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 text-slate-700 rounded-full text-xs font-black shadow-sm">
            <Coins className="w-4 h-4 text-amber-500 fill-amber-500/10" />
            보유: {credits}크레딧
          </div>
        </div>

        {/* Pill Tabs (토스 스타일) */}
        <div className="flex gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl mb-6 overflow-x-auto no-scrollbar shadow-inner">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md font-extrabold scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab View */}
        <div className="transition-all duration-300">
          {activeTab === 'today' && <TodayFortunePage isEmbedded />}
          {activeTab === 'tarot' && <TarotPage isEmbedded />}
          {activeTab === 'trip' && <TripPage isEmbedded />}
          {activeTab === 'jamidusu' && <JamidusuPage isEmbedded />}
          {activeTab === 'kbo' && <KboPage isEmbedded />}
        </div>
      </div>
    </div>
  );
};

export default MyLuckPage;
