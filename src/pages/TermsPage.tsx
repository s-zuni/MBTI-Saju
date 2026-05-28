import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TermsPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-3xl font-bold mb-8 text-slate-900">MBTIJU 서비스 이용약관</h1>
                <div className="prose prose-slate max-w-none text-slate-600 space-y-6 text-sm">
                    <section>
                        <h2 className="text-lg font-bold text-slate-800">제1조 (목적)</h2>
                        <p>본 약관은 엠비티아이주(이하 "회사")가 제공하는 플랫폼 및 관련 제반 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">제2조 (용어의 정의)</h2>
                        <ul className="list-disc pl-5">
                            <li><strong>서비스</strong>: 회사가 제공하는 MBTI 및 사주 명리학 기반의 심층 데이터 분석 서비스('MBTIJU 소울 리포트' 등), 커뮤니티 기능 등을 의미합니다.</li>
                            <li><strong>회원</strong>: 회사의 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객(카카오, 구글 연동 로그인 사용자)을 말합니다.</li>
                            <li><strong>크레딧(크레딧)</strong>: 서비스 내에서 유료 및 특정 콘텐츠를 이용하기 위해 사용되는 가상의 결제수단을 말합니다. (이하 "크레딧")</li>
                            <li><strong>유효기간</strong>: 충전된 크레딧의 유효기간 및 환불 가능 기간은 결제일로부터 1년입니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">제3조 (서비스의 이용 및 회원가입)</h2>
                        <p>① 회원가입은 카카오(Kakao) 및 구글(Google) 계정을 통한 소셜 로그인 방식을 통해 이루어집니다.</p>
                        <p>② 회사는 회원의 서비스 이용 편의를 위해 소셜 로그인 제공자로부터 최소한의 식별 정보를 제공받아 계정을 생성합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">제4조 (크레딧 및 상품의 구매, 이용 및 환불 정책)</h2>
                        <p>① <strong>서비스 이용 흐름</strong>: 회원은 [회원가입 → 크레딧 충전 또는 상품 구매 결제 → 서비스 이용 또는 상품 배송]의 단계를 통해 서비스를 이용하거나 실물 상품을 구매할 수 있습니다.</p>
                        <p>② <strong>결제 방법</strong>: 회원은 토스페이먼츠(Toss Payments) 등 회사가 제공하는 결제 대행사를 통해 크레딧 충전 및 실물 상품을 결제할 수 있습니다. 1회 결제 가능 금액의 최고 한도는 10만 원 이하로 제한됩니다.</p>
                        <p>③ <strong>디지털 재화(크레딧 및 리포트) 환불 정책</strong>:</p>
                        <ul className="list-disc pl-5">
                            <li><strong>환불 가능 조건</strong>: 결제일로부터 7일 이내에 충전한 크레딧을 전혀 사용하지 않은 경우에 한하여 전액 환불이 가능합니다. 단, 환불 가능 기간은 최대 결제일로부터 1년을 초과할 수 없습니다.</li>
                            <li><strong>환불 수단</strong>: 환불 시 “결제에 사용된 동일 결제수단”으로 환불되는 것을 원칙으로 합니다.</li>
                            <li><strong>부분 환불</strong>: 크레딧을 일부 사용한 경우, 사용한 크레딧을 당시 판매가 기준으로 차감한 후 잔액을 환불합니다. 단, 디지털 재화 특성상 사용 직후 가치가 소멸되는 일부 서비스의 경우 환불이 제한될 수 있습니다.</li>
                            <li><strong>결합 심층 리포트 (수기 작성 프리미엄 서비스) 특칙</strong>: '결합 심층 리포트'는 크레딧 결제가 아닌 원화(KRW) 직접 결제로 진행되는 맞춤형 수기 분석 서비스입니다. 결제 완료 후, 전문가가 본격적으로 데이터 수집 및 작성을 시작한 시점부터는 개인 맞춤형 디지털 콘텐츠의 특성상 전자상거래법 제17조 제2항에 의거하여 <strong>교환 및 환불이 엄격히 불가</strong>합니다.</li>
                        </ul>
                        <p>④ <strong>실물 상품 배송 및 환불/교환 정책</strong>:</p>
                        <ul className="list-disc pl-5">
                            <li><strong>배송 기간</strong>: 실물 상품의 배송은 결제 완료일로부터 영업일 기준 2일 ~ 7일 소요됩니다. 천재지변 등 불가항력적인 사유가 발생할 경우 배송 기간에서 제외됩니다.</li>
                            <li><strong>청약철회(반품/교환)</strong>: 회원은 전자상거래법 제17조 제1항에 따라 실물 상품을 공급받은 날로부터 <strong>7일 이내</strong>에 청약철회(반품 및 교환)를 요청할 수 있습니다.</li>
                            <li><strong>반품/교환 제한 사항</strong>: 다음 각 호의 경우에는 청약철회가 제한됩니다.
                                <ul className="list-decimal pl-5 mt-1 space-y-1">
                                    <li>회원의 책임 있는 사유로 상품 등이 멸실되거나 훼손된 경우 (단, 상품 내용을 확인하기 위해 포장 등을 훼손한 경우는 제외)</li>
                                    <li>회원의 사용 또는 일부 소비로 상품 등의 가치가 현저히 감소한 경우</li>
                                    <li>시간이 지나 다시 판매하기 곤란할 정도로 상품 등의 가치가 현저히 감소한 경우</li>
                                    <li>복제가 가능한 상품 등의 포장을 훼손한 경우</li>
                                    <li>개별 주문에 따라 맞춤형으로 제작되는 상품 등 주문제작 상품의 경우</li>
                                </ul>
                            </li>
                            <li><strong>배송비 부담</strong>: 회원의 단순 변심에 의한 반품 및 교환 시 왕복 배송비는 회원이 부담합니다. 단, 상품이 표시·광고 내용과 다르거나 하자가 있는 경우에는 회사가 배송비를 부담합니다.</li>
                            <li><strong>환불 처리</strong>: 회사는 회원으로부터 반품된 상품을 인도받은 날로부터 3영업일 이내에 대금을 환불합니다.</li>
                        </ul>
                        <p>⑤ <strong>양도 및 유효기간</strong>:</p>
                        <ul className="list-disc pl-5">
                            <li>충전한 크레딧은 회원 본인만 사용 가능하며, 타인의 계정으로 양도하거나 타인에게 판매할 수 없습니다.</li>
                            <li>크레딧의 유효기간은 결제일로부터 1년이며, 기간 만료 시 자동으로 소멸됩니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">제5조 (게시물의 관리 및 커뮤니티 이용)</h2>
                        <p>① 회원이 커뮤니티에 작성한 게시물이나 댓글에 대한 모든 권리와 책임은 이를 작성한 회원에게 있습니다.</p>
                        <p>② 회사는 회원의 게시물이 타인의 명예를 훼손하거나, 저작권을 침해하거나, 불법적인 내용을 담고 있다고 판단되는 경우 사전 통지 없이 해당 게시물을 삭제할 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">제6조 (권리의 귀속)</h2>
                        <p>① 서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.</p>
                        <p>② 회원이 입력한 데이터를 기반으로 인공지능(Gemini 등)을 통해 생성된 '분석 리포트' 등 결과물의 소유권 및 사용권은 회사에게 있으며, 회원은 이를 개인적 용도로만 소장 및 활용할 수 있고 회사의 허락 없이 상업적으로 이용할 수 없습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">제7조 (면책 조항)</h2>
                        <p>① 회사의 분석 서비스(사주, MBTI, 타로 등)는 데이터를 바탕으로 한 통계 및 해석을 제공하는 엔터테인먼트적 목적의 참고용 서비스이며, 의학적, 법률적, 재무적, 심리적 전문 상담을 대체할 수 없습니다. 회사는 이 분석 결과의 정확성, 신뢰도 및 결과가 회원의 구체적 목적에 부합하는지에 대해 어떠한 법적 보증도 하지 않으며, 회원이 이를 의존하여 내린 결정이나 발생한 손해에 대해 책임지지 않습니다.</p>
                        <p>② 회사는 천재지변, 서버 장애, 통신망 오류, 결제 대행사(PG사) 및 외부 API(Google Gemini 등)의 서비스 중단 등 불가항력적 사유로 인해 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.</p>
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

export default TermsPage;
