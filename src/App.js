import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import Modal from './components/Modal';
import SignupModal from './components/SignupModal';
import FeatureGrids from './components/FeatureGrids';
import { Sparkles, Brain, Users, Briefcase, Heart, X, ArrowRight } from 'lucide-react';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState(''); // 'signup', 'result'
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const openModal = (view) => {
    setModalView(view);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalView('');
    setError('');
  };

  const handleAnalysis = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = {
      name: e.target.inputName.value,
      gender: e.target.inputGender.value,
      mbti: e.target.inputMbti.value,
      birth_date: e.target.inputBirthDate.value,
      birth_time: e.target.birthTimeUnknown?.checked
        ? "unknown"
        : `${e.target.inputBirthHour.value}:${e.target.inputBirthMinute.value}`
    };

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error('분석 중 오류가 발생했습니다.');
      }

      const data = await res.json();
      setAnalysisResult(data);
      setModalView('result');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([k, v]) => {
        let valStr = (typeof v === 'object') ? JSON.stringify(v) : v;
        if (!isNaN(k)) return `<div class="mb-2 text-slate-600">${valStr}</div>`;
        return `<div class="mb-3 flex gap-2"><span class="font-bold text-indigo-600 shrink-0">· ${k}:</span><span class="text-slate-600">${valStr}</span></div>`;
      }).join('');
    }
    return String(value || '').replace(/\n/g, '<br>');
  }

  return (
    <div className="selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <Navbar openSignupModal={() => openModal('signup')} />

      <HeroSection onStart={() => openModal('signup')} />

      <FeatureGrids onStart={() => openModal('signup')} />

      {/* Featured Analysis Section */}
      <section className="py-24 bg-slate-50/50 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        <div className="section-container relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">MBTI와 사주의 새로운 만남</h2>
            <p className="text-slate-500 font-medium">단순한 재미를 넘어, 깊이 있는 자아 분석을 제공합니다.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">심도 있는 성격 매칭</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">당신의 무의식과 타고난 운명이 어떻게 연결되어 있는지 과학적으로 분석합니다.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                <Briefcase className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">커리어 컨설팅</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">나의 선천적 기운과 후천적 성향이 가장 잘 발휘될 수 있는 직업군을 제안합니다.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">인간관계 솔루션</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">당신이 조심해야 할 운명과 시너지를 낼 수 있는 인연의 색깔을 알려드립니다.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <Modal showModal={showModal} closeAllModals={closeModal}>
        {modalView === 'signup' && (
          <SignupModal
            handleSignup={handleAnalysis}
            closeAllModals={closeModal}
            isLoading={isLoading}
            error={error}
          />
        )}
        {modalView === 'result' && analysisResult && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white fill-white" />
                </div>
                <h3 className="font-bold text-slate-900">운명 분석 리포트</h3>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-8 max-h-[75vh] overflow-y-auto no-scrollbar space-y-8">
              <div className="text-center mb-4">
                <p className="text-sm font-bold text-indigo-500 mb-1">Analysis Complete</p>
                <h4 className="text-3xl font-black text-slate-900">당신의 신비한 기록</h4>
              </div>

              {/* Analysis Cards */}
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <h5 className="font-bold text-slate-900 uppercase tracking-wider text-xs">✨ 사주 총평</h5>
                  </div>
                  <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.saju) }} />
                </div>

                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center">
                      <Brain className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h5 className="font-bold text-indigo-900 uppercase tracking-wider text-xs">🧠 MBTI 연계</h5>
                  </div>
                  <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.mbti) }} />
                </div>

                <div className="bg-teal-50/50 p-6 rounded-3xl border border-teal-100/50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                    </div>
                    <h5 className="font-bold text-teal-900 uppercase tracking-wider text-xs">🤝 핵심 성향</h5>
                  </div>
                  <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.trait) }} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Briefcase className="w-4 h-4 text-orange-600" />
                      <h5 className="font-bold text-orange-900 uppercase tracking-wider text-xs">💼 추천 직업</h5>
                    </div>
                    <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.jobs) }} />
                  </div>
                  <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                      <h5 className="font-bold text-rose-900 uppercase tracking-wider text-xs">❤️ 추천 인연</h5>
                    </div>
                    <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.match) }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                다른 분석 더 보기 <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
