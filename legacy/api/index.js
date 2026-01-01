import React, { useState } from 'react';
import { 
  Menu, X, Sparkles, Scroll, Brain, 
  MessageCircle, ShoppingBag, ArrowRight, User, Check 
} from 'lucide-react';

/**
 * MBTIJU 메인 애플리케이션
 * - 기존 MBTI+사주 분석 로직을 '무료 분석(회원가입)' 모달에 통합했습니다.
 */
export default function MBTIJU() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    birthDate: '',
    birthHour: '',
    birthMinute: '',
    mbti: ''
  });

  // 입력 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 분석 요청 핸들러
  const handleAnalyze = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);

    // 필수값 검증
    if (!formData.name || !formData.gender || !formData.birthDate || !formData.birthHour || !formData.birthMinute || !formData.mbti) {
      setError('모든 정보를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        gender: formData.gender,
        birth_date: formData.birthDate,
        birth_time: `${formData.birthHour}:${formData.birthMinute}`,
        mbti: formData.mbti
      };

      // Vercel Serverless Function 호출
      // [수정 포인트] 경로를 '/api' -> '/api/analyze'로 명확히 지정하거나
      // 백엔드 구조(api/index.js)가 '/' 경로를 처리한다면 '/api' 그대로 사용 가능합니다.
      // 여기서는 일반적인 관례에 따라 '/api'로 요청합니다. (Vercel의 api 디렉토리 구조에 따름)
      const res = await fetch('/api', { // 만약 api/analyze.js 파일이라면 '/api/analyze' 로 변경
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errMsg = `서버 오류 (${res.status})`;
        try {
            const errData = await res.json();
            if (errData.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setAnalysisResult(data);
      
    } catch (err) {
      console.error(err);
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 결과 텍스트 포맷팅 (객체 -> 문자열 변환)
  const formatResult = (value) => {
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([k, v], i) => (
        <div key={i} className="mb-1">
          <span className="font-bold text-indigo-600 mr-2">· {k}:</span>
          {typeof v === 'object' ? JSON.stringify(v) : v}
        </div>
      ));
    }
    return value;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. Global Navigation Bar (Sticky) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <Sparkles className="w-6 h-6 text-indigo-500" />
            <span className="text-xl font-bold tracking-tight text-gray-900">MBTIJU</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {['홈', '유형 도감', '커뮤니티', '스토어'].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                {item}
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-4 py-2 border border-gray-200 rounded-full hover:border-indigo-200 transition-all"
            >
              로그인
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-full shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
            >
              무료 분석 시작
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 p-4 flex flex-col gap-4 shadow-lg animate-fade-in-down">
            {['홈', '유형 도감', '커뮤니티', '스토어'].map((item) => (
              <a key={item} href="#" className="text-base font-medium text-gray-600 py-2">{item}</a>
            ))}
            <div className="h-px bg-gray-100 my-2" />
            <button onClick={() => setIsModalOpen(true)} className="w-full py-3 text-indigo-600 font-bold bg-indigo-50 rounded-xl">
              무료 분석 시작하기
            </button>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-blue-50 to-transparent rounded-[100%] blur-3xl -z-10 opacity-60 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">AI 기반 운명 분석</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            나를 알아가는<br className="md:hidden" /> 가장 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">명쾌한 시간</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            MBTI의 심리학과 사주의 지혜를 결합하여 당신의 가능성을 발견하세요.<br className="hidden md:block" />
            복잡한 분석은 AI에게 맡기고, 당신은 해답만 확인하면 됩니다.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              내 운명 분석하기 <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-[-8px]">
              <div className="flex -space-x-2 mr-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" style={{backgroundImage: `url(https://i.pravatar.cc/100?img=${10+i})`, backgroundSize:'cover'}} />
                ))}
              </div>
              <span className="text-sm text-gray-500 font-medium">12,400+ 명이 분석 완료</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Insight Cards */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Brain, title: "과학적 성향 분석", desc: "MBTI 이론을 바탕으로 당신의 사고 방식과 행동 패턴을 정밀하게 분석합니다.", color: "text-indigo-600", bg: "bg-indigo-50" },
              { icon: Scroll, title: "운명의 흐름 파악", desc: "사주 명리학 데이터를 통해 타고난 기운과 앞으로 다가올 기회를 예측합니다.", color: "text-teal-600", bg: "bg-teal-50" },
              { icon: Sparkles, title: "AI 맞춤 솔루션", desc: "두 가지 데이터를 결합하여 오직 당신만을 위한 커리어와 관계 조언을 제공합니다.", color: "text-purple-600", bg: "bg-purple-50" }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-xl transition-all duration-300 group">
                <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Wiki Preview */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-gray-900">오늘의 탐구 유형</h2>
            <a href="#" className="text-indigo-600 font-semibold hover:underline">모두 보기</a>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { type: "ISTP", element: "금(Metal)", title: "날카로운 장인 정신", img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400" },
              { type: "ENFP", element: "화(Fire)", title: "타오르는 영감의 불꽃", img: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&q=80&w=400" },
              { type: "INFJ", element: "수(Water)", title: "깊고 고요한 통찰력", img: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&q=80&w=400" },
              { type: "ESTJ", element: "목(Wood)", title: "곧게 뻗은 리더십", img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=400" },
            ].map((card, idx) => (
              <div key={idx} className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer">
                <img src={card.img} alt={card.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs font-bold">{card.type}</span>
                    <span className="px-2 py-0.5 bg-indigo-500/80 backdrop-blur-sm rounded text-xs font-bold">{card.element}</span>
                  </div>
                  <h3 className="text-xl font-bold">{card.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Community Highlights */}
      <section className="py-20 px-6 bg-white border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">실시간 이야기</h2>
            <p className="text-gray-500">같은 고민을 가진 사람들과 이야기를 나눠보세요.</p>
          </div>
          <div className="space-y-4">
            {[
              { tag: "ENTJ", saju: "편관격", title: "직장 상사와의 갈등, 사주로 보니 이해가 가네요", comments: 12, time: "방금 전" },
              { tag: "ISFP", saju: "식신", title: "예술 쪽 진로 고민.. 저랑 같은 분 계신가요?", comments: 8, time: "5분 전" },
              { tag: "INTJ", saju: "인성혼잡", title: "생각이 너무 많아서 잠이 안 올 때 팁", comments: 24, time: "1시간 전" },
            ].map((post, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">{post.tag}</span>
                    <span className="text-[10px] font-medium text-gray-400">{post.saju}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-700">{post.title}</h4>
                    <span className="text-xs text-gray-400 md:hidden">{post.time} · 댓글 {post.comments}</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
                  <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments}</span>
                  <span>{post.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button className="text-indigo-600 font-semibold hover:underline">커뮤니티 입장하기</button>
          </div>
        </div>
      </section>

      {/* 6. Premium Store */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">더 깊이 알아보기</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "심층 직무 적성 보고서", price: "₩9,900", desc: "당신의 잠재력이 폭발하는 직업군 TOP 5" },
              { title: "2025년 대운 분석", price: "₩14,900", desc: "월별 상세 운세와 주의해야 할 시기" },
              { title: "프리미엄 궁합 솔루션", price: "₩19,900", desc: "썸, 연애, 결혼까지 단계별 관계 가이드" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 mb-6 text-sm">{item.desc}</p>
                <div className="text-2xl font-extrabold text-indigo-600 mb-6">{item.price}</div>
                <button className="w-full py-3 rounded-xl border border-gray-200 font-bold hover:bg-gray-900 hover:text-white hover:border-transparent transition-all">
                  구매하기
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-gray-400">MBTIJU</span>
          </div>
          <div className="text-sm text-gray-400">
            © 2025 MBTIJU Corp. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-gray-600">Instagram</a>
            <a href="#" className="text-gray-400 hover:text-gray-600">Twitter</a>
            <a href="#" className="text-gray-400 hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>

      {/* Analysis / Signup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {analysisResult ? '분석 결과' : '무료 분석 및 회원가입'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!analysisResult ? (
                // 입력 폼 (Sign Up Form)
                <form onSubmit={handleAnalyze} className="space-y-5">
                  <div className="bg-indigo-50 p-4 rounded-xl mb-4">
                    <p className="text-sm text-indigo-700 font-medium">✨ 정보를 입력하면 5가지 운명 분석 결과가 즉시 제공됩니다.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">이름</label>
                    <input 
                      name="name" required
                      value={formData.name} onChange={handleInputChange}
                      placeholder="홍길동" 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">성별</label>
                      <select name="gender" required value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none">
                        <option value="">선택</option>
                        <option>남성</option>
                        <option>여성</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">MBTI</label>
                      <select name="mbti" required value={formData.mbti} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none">
                        <option value="">선택</option>
                        {['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">생년월일 (양력)</label>
                    <input type="date" name="birthDate" required value={formData.birthDate} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">출생 시간</label>
                    <div className="flex gap-2">
                      <select name="birthHour" required value={formData.birthHour} onChange={handleInputChange} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none">
                        <option value="">시</option>
                        {[...Array(24)].map((_, i) => (
                          <option key={i} value={String(i).padStart(2,'0')}>{String(i).padStart(2,'0')}시</option>
                        ))}
                      </select>
                      <select name="birthMinute" required value={formData.birthMinute} onChange={handleInputChange} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none">
                        <option value="">분</option>
                        {[0,10,20,30,40,50].map(m => (
                          <option key={m} value={String(m).padStart(2,'0')}>{String(m).padStart(2,'0')}분</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        분석 중...
                      </>
                    ) : (
                      <>분석 결과 확인하기 <Check className="w-5 h-5" /></>
                    )}
                  </button>
                </form>
              ) : (
                // 결과 화면 (Result View)
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center pb-6 border-b border-gray-100">
                    <div className="inline-block p-2 bg-indigo-100 rounded-full mb-3">
                      <User className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{formData.name}님의 분석 리포트</h2>
                    <p className="text-gray-500">{formData.birthDate} {formData.birthHour}:{formData.birthMinute} · {formData.mbti}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5" /> 사주 분석</h4>
                      <div className="text-gray-700 text-sm leading-relaxed">{formatResult(analysisResult.saju)}</div>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2"><Brain className="w-5 h-5" /> MBTI 분석</h4>
                      <div className="text-gray-700 text-sm leading-relaxed">{formatResult(analysisResult.mbti)}</div>
                    </div>

                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                      <h4 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">🤝 핵심 성향 (결합)</h4>
                      <div className="text-indigo-800 text-sm leading-relaxed">{formatResult(analysisResult.trait)}</div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 p-4 rounded-xl">
                        <h4 className="font-bold text-gray-900 mb-2">💼 추천 직업</h4>
                        <div className="text-gray-600 text-sm">{formatResult(analysisResult.jobs)}</div>
                      </div>
                      <div className="bg-white border border-gray-200 p-4 rounded-xl">
                        <h4 className="font-bold text-gray-900 mb-2">❤️ 추천 궁합</h4>
                        <div className="text-gray-600 text-sm">{formatResult(analysisResult.match)}</div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setAnalysisResult(null); setIsModalOpen(false); }}
                    className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl mt-4"
                  >
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}