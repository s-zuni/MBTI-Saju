import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, BarChart3, Clock } from 'lucide-react';

interface DeepReportLandingPageProps {
  onOpenDeepReport: (reportType?: string) => void;
}

const DeepReportLandingPage: React.FC<DeepReportLandingPageProps> = ({ onOpenDeepReport }) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 font-sans min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-16 px-6 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full mb-6">
            <span className="text-xs font-semibold text-slate-700">1,000만 건 이상 데이터 분석 · 전문가 수기 점검</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-slate-950">
            과학적 데이터 분석으로 밝혀내는<br />
            <span className="text-violet-600">당신의 정밀 운명 솔루션</span>
          </h1>
          
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            신비주의 사주에서 벗어나, 1,000만 건 이상의 데이터 기반 통계 분석과 전문가의 엄격한 수기 점검을 통해 당신의 인생 로드맵을 정밀 제시합니다.
          </p>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left px-2">
            {/* Card 1: 4-Year Saju Deep Report */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-all">
              <div>
                <div className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md mb-4">
                  4년 심층 리포트
                </div>
                <h3 className="text-xl font-bold text-slate-950 mb-2">4년 사주 심층 리포트</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-6">
                  1,000만 건 데이터 기반 분석 + 전문가 수기 점검. 4개년 월별 운세 흐름 및 MBTI 심리학 결합 정밀 로드맵 (A4 20장 분량)
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> 사주원국 & 오행 데이터 정밀 해독
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> 향후 4년 세부 세운 및 월별 흐름
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> MBTI 심리학 모델 융합 성향 분석
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> 전문가 수기 검증 및 맞춤 솔루션
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-slate-400 line-through text-xs">₩39,900</span>
                  <span className="text-2xl font-black text-slate-950">₩29,900</span>
                </div>
                <button 
                  onClick={() => onOpenDeepReport('saju')}
                  className="w-full py-3.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-center flex items-center justify-center gap-2 text-sm"
                >
                  4년 심층 리포트 신청 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: 1:1 Fate Consultation (/chat) */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-all">
              <div>
                <div className="inline-block px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-md mb-4">
                  1:1 실시간 대화
                </div>
                <h3 className="text-xl font-bold text-slate-950 mb-2">1대1 심층 운명 상담</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-6">
                  당신의 고민과 사주 데이터에 대해 실시간 1대1 대화로 정밀 분석 답변을 제공합니다.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> 사주 데이터 및 만세력 정밀 분석
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> 실시간 1:1 심층 질문 답변
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> 개인별 맞춤 문제 해결 가이드
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 text-xs">
                    <span className="text-violet-600 font-bold">✓</span> 전문가 수기 검증 기준 체계 적용
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <span className="text-xs font-semibold text-slate-500">실시간 1:1 심층 대화 상담</span>
                </div>
                <button 
                  onClick={() => navigate('/chat')}
                  className="w-full py-3.5 bg-slate-950 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-center flex items-center justify-center gap-2 text-sm"
                >
                  1대1 심층 운명 상담 시작하기 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 고민 해결 카테고리 Section */}
      <section className="py-20 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full border border-violet-100 uppercase">Scientific Data Solution</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mt-4 mb-3">복잡한 고민의 원인을 데이터로 정밀하게 분석합니다</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm leading-relaxed">
              1,000만 건 데이터 분석 알고리즘과 전문가 수기 점검 체계로 개인의 성향과 세운 흐름을 객관적으로 도출합니다.
            </p>
          </div>

          {/* 고민 카테고리 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {[
              {
                icon: "favorite",
                title: "연애 & 궁합 고민",
                desc: "관계 패턴의 통계적 요인, 이상형 기질 분석 및 상호 간 시너지 시기 포착",
              },
              {
                icon: "work",
                title: "진로 & 이직 고민",
                desc: "기질적 적성 파악, 이직 및 직무 전환 타이밍 데이터 수치화",
              },
              {
                icon: "payments",
                title: "재물 & 사업 분석",
                desc: "재물적 환경 요소 분석 및 변동성이 적은 의사결정 시점 제안",
              },
              {
                icon: "psychology",
                title: "성향 & 심리 처방",
                desc: "MBTI 유형과 생년월일시 데이터 교차 분석을 통한 객관적 성향 진단",
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-xl text-slate-700">{item.icon}</span>
                </div>
                <h3 className="text-base font-bold text-slate-950 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* 해결 사례 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-slate-950 mb-2">데이터 기반 분석 활용 사례</h3>
              <p className="text-slate-500 text-xs">객관적인 데이터 분석과 전문가 검증으로 인생의 이정표를 찾은 사례입니다.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-violet-600 font-bold text-xs">Case 1. 이직 시점 결정 분석</div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <p className="text-slate-700 text-xs leading-relaxed mb-3">
                    "막연한 불안감 대신 세운의 변동 데이터와 내 기질 특성을 수치로 확인하여 자신감 있게 합리적인 이직 시점을 선택할 수 있었습니다."
                  </p>
                  <div className="text-slate-500 text-[11px] font-medium">- 30대 개발자 김*진 님</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-violet-600 font-bold text-xs">Case 2. 성향 차이 해소</div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <p className="text-slate-700 text-xs leading-relaxed mb-3">
                    "1대1 심층 운명 상담을 통해 나와 상대방의 성향 차이를 감정이 아닌 객관적 분석표로 이해하게 되었습니다."
                  </p>
                  <div className="text-slate-500 text-[11px] font-medium">- 20대 프리랜서 박*지 님</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Value Proposition */}
      <section className="py-20 px-6 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3">Core Values</div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-8 text-slate-950 leading-tight">
                과학적 분석과 전문가 점검이 만든<br />
                신뢰할 수 있는 데이터 분석
              </h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1 text-slate-950">1,000만 건 이상의 빅데이터 기반</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">막연한 점술적 해석을 배제하고, 방대한 데이터를 바탕으로 통계적 정밀도를 높였습니다.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1 text-slate-950">전문가의 엄격한 수기 점검</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">자동화 산출 결과에만 의존하지 않고, 전문 연구진이 수기로 직접 검증하여 완성도를 확보합니다.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-slate-800" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1 text-slate-950">MBTI 심리학 교차 매칭</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">동양 명리학과 서양 성격 심리학을 과학적으로 매칭하여 명확한 행동 솔루션을 제시합니다.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-xs font-bold text-violet-600 block mb-1">체계적인 분석 프로세스</span>
                  <p className="text-xs text-slate-700 font-medium">데이터 추출 → 융합 지표 산출 → 전문가 수기 검증 → 맞춤 보고서 전달</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-xs font-bold text-slate-900 block mb-1">데이터 신뢰도</span>
                  <p className="text-xs text-slate-600">누적 1,000만 건 데이터 연산 알고리즘 적용</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-slate-950">자주 묻는 질문</h2>
            <p className="text-slate-500 mt-2 text-xs">서비스 이용에 필요한 안내사항을 확인해 보세요.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Q. 1대1 심층 운명 상담과 4년 심층 리포트의 차이는 무엇인가요?",
                a: "1대1 심층 운명 상담(/chat)은 실시간 대화를 통해 고민에 대해 즉각적인 질의응답을 나누는 모델이며, 4년 심층 리포트는 A4 20장 분량의 종합 분석 PDF를 발송해 드리는 서비스입니다."
              },
              {
                q: "Q. 1,000만 건 데이터 분석과 전문가 수기 점검은 어떻게 진행되나요?",
                a: "입력된 데이터에 기반해 1,000만 건의 통계 알고리즘으로 1차 분석을 수행한 후, 명리 전문가가 수기로 이상 여부를 점검 및 검증하여 최종 전달됩니다."
              },
              {
                q: "Q. 리포트는 결제 후 언제 받아볼 수 있나요?",
                a: "전문가 수기 점검 절차를 거치므로 결제 후 영업일 기준 1~2일 내에 등록하신 이메일로 PDF 파일이 자동 전달됩니다."
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-950 mb-2">{faq.q}</h4>
                <p className="text-slate-600 text-xs leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 text-center bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950 mb-8">
            과학적인 데이터 분석으로<br />
            당신의 새로운 운명을 설계해 보세요.
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => onOpenDeepReport('saju')}
              className="w-full sm:w-auto px-8 py-4 bg-violet-600 text-white rounded-xl font-bold transition-colors hover:bg-violet-700 text-sm"
            >
              4년 심층 리포트 신청 (₩29,900)
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-950 text-white rounded-xl font-bold transition-colors hover:bg-slate-800 text-sm"
            >
              1대1 심층 운명 상담 시작하기 (/chat)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DeepReportLandingPage;
