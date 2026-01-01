import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import Modal from './components/Modal';
import SignupModal from './components/SignupModal';

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
        if (!isNaN(k)) return `<div class="mb-1">${valStr}</div>`;
        return `<div class="mb-1"><span class="font-bold text-indigo-600 mr-2">· ${k}:</span>${valStr}</div>`;
      }).join('');
    }
    return String(value || '').replace(/\n/g, '<br>');
  }

  return (
    <div className="bg-gray-50 text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar
        user={null}
        openLoginModal={() => { }}
        openSignupModal={() => openModal('signup')}
        openMyPageModal={() => { }}
        handleLogout={() => { }}
      />

      <HeroSection onStart={() => openModal('signup')} />

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">나의 운명 분석</h2>
          <button
            onClick={() => openModal('signup')}
            className="px-8 py-4 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-all"
          >
            분석 시작하기
          </button>
        </div>
      </section>

      <Footer />

      <Modal showModal={showModal} closeAllModals={closeModal}>
        {modalView === 'signup' && (
          <SignupModal
            handleSignup={handleAnalysis}
            openLoginModal={() => { }}
            closeAllModals={closeModal}
            isLoading={isLoading}
            error={error}
          />
        )}
        {modalView === 'result' && analysisResult && (
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">분석 결과</h3>
              <p className="text-gray-500">당신만을 위한 맞춤형 분석 리포트입니다.</p>
            </div>
            <div className="space-y-6">
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h4 className="font-bold text-indigo-900 mb-2">✨ 사주 분석</h4>
                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.saju) }} />
              </div>
              <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100">
                <h4 className="font-bold text-teal-900 mb-2">🧠 MBTI 분석</h4>
                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.mbti) }} />
              </div>
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                <h4 className="font-bold text-purple-900 mb-2">🤝 핵심 성향 (결합)</h4>
                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.trait) }} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">💼 추천 직업</h4>
                  <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.jobs) }} />
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">❤️ 추천 궁합</h4>
                  <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: formatValue(analysisResult.match) }} />
                </div>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl mt-8"
            >
              닫기
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
