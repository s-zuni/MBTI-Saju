import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar
                session={null}
                onLoginClick={() => window.location.href = '/'}
                onTarotClick={() => window.location.href = '/'}
            />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-3xl font-bold mb-8 text-slate-900">MBTIJU 개인정보처리방침</h1>
                <div className="prose prose-slate max-w-none text-slate-600 space-y-6 text-sm">
                    <p>엠비티아이주(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">1. 개인정보의 처리 목적 및 수집 항목</h2>
                        <p>회사는 다음의 목적을 위하여 최소한의 개인정보를 수집 및 처리합니다.</p>
                        <ul className="list-disc pl-5">
                            <li><strong>회원 가입 및 관리 (소셜 로그인)</strong>: 카카오(Kakao), 구글(Google) 계정 연동을 통한 본인 식별, 가입 의사 확인, 고객 상담.
                                <br />- 수집항목: 이름(닉네임), 이메일 주소, 프로필 사진</li>
                            <li><strong>서비스 제공 및 맞춤형 융합 분석</strong>: MBTI 및 사주 명리학 분석 결과(소울 리포트 등) 생성 및 제공.
                                <br />- 수집항목: 생년월일, 성별, 태어난 시간(선택), MBTI 유형</li>
                            <li><strong>요금 결제 및 환불</strong>: 유료 서비스(코인 충전) 결제, 환불 및 영수증 발급.
                                <br />- 수집항목: 결제 기록, 결제 수단 정보(토스페이먼츠 제공 항목)</li>
                            <li><strong>마케팅 및 웹/앱 푸시 (동의 시)</strong>: 신규 서비스 안내, 이벤트 및 프로모션 정보 제공.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">2. 개인정보의 처리 및 보유 기간</h2>
                        <p>① 회사는 법령에 따른 보호 의무 등에 따라 원칙적으로 <strong>회원 탈퇴 후 60일간</strong> 개인정보를 보관한 뒤 지체 없이 파기합니다. (부정 이용 방지 및 소비자 불만 처리 목적)</p>
                        <p>② 단, 관련 법령에 의하여 보존할 필요가 있는 경우 다음과 같이 일정 기간 보관합니다.</p>
                        <ul className="list-disc pl-5">
                            <li>전자상거래 등에서의 소비자보호에 관한 법률에 따른 기록: 대금결제 및 재화 서비스 등의 공급 <strong>5년</strong>, 소비자의 불만 또는 분쟁 처리 기록 <strong>3년</strong></li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">3. 개인정보의 제3자 제공 및 처리 위탁</h2>
                        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 외부 전문 업체에 위탁 및 제공하고 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>데이터베이스 저장 및 관리</strong>
                                <br />- 수탁자: Supabase
                                <br />- 제공 목적: 클라우드 기반 회원 정보 및 분석 데이터, 커뮤니티 데이터의 안전한 보관
                            </li>
                            <li>
                                <strong>AI 심층 데이터 분석 처리</strong>
                                <br />- 수탁자: Google (Gemini API)
                                <br />- 제공 목적: 입력받은 사주 및 MBTI 데이터를 기반으로 인공지능 프롬프트 연산을 통한 분석 결과 생성. (API 특성상 데이터는 임시 처리 후 AI 학습에 사용되지 않도록 설정)
                            </li>
                            <li>
                                <strong>결제 대행 및 처리 (PG)</strong>
                                <br />- 수탁자: 토스페이먼츠(Toss Payments)
                                <br />- 제공 목적: 코인 충전을 위한 신용카드, 간편결제 등 요금 결제 대행
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">4. 정보주체의 권리와 그 행사 방법</h2>
                        <p>① 회원은 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 통해 개인정보의 수집 및 이용 동의를 철회할 수 있습니다.</p>
                        <p>② 개인정보 조회, 수정, 탈퇴는 서비스 내 [마이페이지] 기능을 통해 온라인으로 즉시 처리할 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">5. 개인정보의 파기 절차 및 방법</h2>
                        <p>회사는 보존 기간이 경과하거나 처리 목적이 달성된 경우, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기하고, 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 파기합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">6. 마케팅 정보 수신 동의 (선택)</h2>
                        <p>회사는 회원이 별도로 마케팅 수신에 동의한 경우에 한하여 이벤트 및 광고성 정보를 이메일, 앱 푸시 알림 등으로 발송할 수 있습니다. 회원은 언제든지 [마이페이지 - 설정]에서 수신 동의를 철회할 수 있습니다.</p>
                    </section>

                    <p className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100">
                        공고일자: 2026년 3월 6일 <br />
                        시행일자: 2026년 3월 6일
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PrivacyPage;
