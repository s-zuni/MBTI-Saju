import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-3xl font-bold mb-8 text-slate-900">MBTIJU 개인정보처리방침</h1>
                <div className="prose prose-slate max-w-none text-slate-600 space-y-6 text-sm leading-relaxed">
                    <p>스즈니 (SZUNI)(이하 &quot;회사&quot;)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">1. 개인정보의 처리 목적 및 수집 항목</h2>
                        <p>회사는 회원가입 없는 비회원 즉시 이용 체계를 원칙으로 하며, 다음 각 서비스 제공 및 법령상 의무 이행을 위해 필요한 최소한의 정보만을 수집·처리합니다.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>비회원 단건 사주·MBTI·타로·운세 AI 분석 서비스</strong>: 만세력 연산 및 맞춤형 AI 분석 결과 생성·화면 출력.
                                <br />- 입력·전송 항목: 이름/별명(선택), 생년월일, 태어난 시간(선택), 성별, MBTI 유형, 고민/질문 내용, 궁합 분석 시 상대방 정보(이름/별명, 생년월일, 태어난 시간, 성별, MBTI)
                                <br />- 비고: 궁합 등 제3자 정보를 입력하는 경우, 이용자 본인이 해당 정보주체의 적법한 동의를 받았음을 보증하며 무단 입력에 따른 법적 책임은 이용자에게 있습니다.
                            </li>
                            <li>
                                <strong>단건 결제, 부정 이용 방지 및 고객 환불 CS</strong>: 건별 유료 결제 승인, 장애 환불 확인, 비정상 대량 호출 차단(Rate Limit).
                                <br />- 수집 항목: 주문번호(`orderId`), 결제키(`paymentKey`), 결제 금액 및 수단 정보(토스페이먼츠 제공 항목), 접속 IP 주소 및 요청 로그
                            </li>
                            <li>
                                <strong>전문가 수기 점검 프리미엄 (3년 심층 사주 리포트) 서비스</strong>: 만세력·AI 심층 분석 및 전문가 검수 후 리포트 이메일 발송.
                                <br />- 수집 항목: 이메일(결과물 발송용), 카카오톡 ID(선택), 성명, 생년월일시, 양력/음력 여부, 성별, MBTI 유형, 특별 요청사항
                            </li>
                            <li>
                                <strong>카카오톡 채널 1:1 상담</strong>: 카카오톡 채널 대화방을 통한 상담 접수, 입금 확인, 답변 전달 및 환불 처리.
                                <br />- 수집 항목: 이름(닉네임), 카카오톡 프로필명, 생년월일, 태어난 시간(선택), 양력/음력 구분, 성별, MBTI 유형, 상담 질문 내용, 입금자명, 환불 시 환불 계좌 정보, 현금영수증 발급 요청 시 발급용 번호
                            </li>
                            <li>
                                <strong>실물 상품 배송 (`/shop`)</strong>: 주문 처리, 상품 배송 및 배송 추적.
                                <br />- 수집 항목: 주문자 정보, 수령인 이름, 배송지 주소, 수령인 연락처(휴대폰 번호)
                            </li>
                            <li>
                                <strong>기존 회원 및 관리자 계정 (별도 구분 운영)</strong>: 개편 이전 소셜 로그인 가입 회원의 기존 데이터 조회·환불 CS 및 내부 관리자(`/admin`) 인증.
                                <br />- 수집 항목: 이름(닉네임), 이메일 주소, 소셜 식별자, 역할(`role`) 정보
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">2. 브라우저 로컬 저장소(`localStorage`) 이용 및 관리 책임</h2>
                        <p>① 회사는 회원가입 없이도 이용자가 여러 서비스를 연속적으로 편리하게 이용할 수 있도록, 입력하신 프로필(이름·성별·생년월일·출생시간·MBTI), 임시 결제 티켓, AI 채팅 이용권 잔여 횟수 및 일부 분석 결과를 이용자의 기기 브라우저 `localStorage`에 저장할 수 있습니다.</p>
                        <p>② `localStorage` 데이터는 회사의 중앙 회원 계정이 아닌 <strong>이용자 기기 내부에만 저장</strong>되며, 이용자는 언제든 브라우저 설정(&quot;사이트 데이터 및 캐시 삭제&quot;)을 통해 직접 삭제할 수 있습니다. 공용 PC 또는 타인과 공유하는 기기에서 사용 후 브라우저 데이터를 삭제하지 않아 발생한 개인정보 노출이나, 이용자의 캐시 삭제로 인한 결과 유실에 대해 회사는 책임을 지지 않습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">3. 개인정보의 처리 및 보유 기간</h2>
                        <p>① <strong>비회원 단건 AI 분석 입력 정보</strong>: 만세력 연산 및 AI 응답 스트리밍 생성을 위해 일시 처리되며, 별도의 비회원 결과 DB에 영구 저장하지 않는 것을 원칙으로 합니다.</p>
                        <p>② <strong>3년 심층 리포트 및 카카오톡 상담 기록</strong>: 상담·리포트 전달 및 재발송·분쟁 대응을 위해 서비스 완료 후 <strong>6개월</strong>간 보관 후 파기합니다(단, 아래 법령 보존 대상 제외).</p>
                        <p>③ <strong>기존 회원 계정</strong>: 회원 탈퇴 요청 시 법령상 의무 보관 항목 및 부정 이용 방지(재가입·남용 확인) 목적의 최소 식별 정보를 제외하고 지체 없이 파기하며, 부정 이용 방지 목적 정보는 최대 60일 보관 후 파기합니다.</p>
                        <p>④ <strong>관련 법령에 따른 의무 보유 기간</strong>:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>전자상거래 등에서의 소비자보호에 관한 법률: 대금결제 및 재화 등의 공급에 관한 기록 <strong>5년</strong>, 계약 또는 청약철회 등에 관한 기록 <strong>5년</strong>, 소비자의 불만 또는 분쟁처리에 관한 기록 <strong>3년</strong></li>
                            <li>통신비밀보호법: 웹사이트 방문·접속 로그 기록 <strong>3개월</strong></li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">4. 개인정보의 처리 위탁 및 국외 이전 안내</h2>
                        <p>회사는 안정적인 결제, 분석 및 인프라 운영을 위해 아래와 같이 업무를 위탁하고 있으며, 일부 AI 및 클라우드 서비스는 국외 서버(미국 등)를 통해 처리됩니다. 회사는 수탁사가 AI API 입력 데이터를 자체 모델 학습에 사용하지 않도록 API 설정을 유지하고 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>결제 대행 (국내)</strong>: 토스페이먼츠 주식회사 — 신용카드·간편결제 등 단건 결제 승인 및 취소 처리
                            </li>
                            <li>
                                <strong>카카오톡 채널 상담 (국내)</strong>: 주식회사 카카오 — 카카오톡 채널 1:1 상담 메시지 송수신
                            </li>
                            <li>
                                <strong>실물 상품 배송 (국내)</strong>: 우체국택배, CJ대한통운 등 — 구매 상품 배송 및 배송 추적
                            </li>
                            <li>
                                <strong>AI 분석 연산 처리 (국외 이전: 미국)</strong>: OpenAI, L.L.C. / Google LLC — 입력된 사주 만세력·MBTI·질문 데이터 기반 텍스트 생성(요청 시점 실시간 API 전송 및 응답 후 파기 원칙)
                            </li>
                            <li>
                                <strong>클라우드 인프라 및 DB 관리 (국외 이전: 미국/글로벌 리전)</strong>: Vercel Inc. / Supabase Inc. — 웹·API 서버리스 호스팅, 주문·심층리포트·비정상 호출 방어 로그 보관
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">5. 정보주체의 권리와 행사 방법</h2>
                        <p>① 비회원 이용자는 브라우저 사이트 데이터 삭제를 통해 로컬 기기에 저장된 모든 입력 정보를 즉시 파기할 수 있습니다.</p>
                        <p>② 결제·주문·심층 리포트·기존 회원 계정에 보관된 개인정보의 열람, 정정, 삭제, 처리정지 요청은 아래 개인정보 보호책임자 또는 고객센터(`070-8095-3075`, 카카오톡 채널)를 통해 요청하실 수 있으며, 회사는 본인 및 주문번호 확인 후 법령이 정한 기한 내에 지체 없이 조치합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">6. 개인정보의 파기 절차 및 안전성 확보 조치</h2>
                        <p>회사는 보유 기간 경과 또는 처리 목적 달성 시 전자적 파일은 복구 불가능한 기술적 방법으로 영구 삭제하고, 출력물은 분쇄·소각합니다. 또한 API 키 서버 격리, TLS 암호화 통신, 데이터베이스 행 수준 보안(RLS) 및 IP Rate Limit을 적용하여 개인정보를 보호합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-800">7. 개인정보 보호책임자 및 권익침해 구제방법</h2>
                        <p>① 개인정보 보호책임자: 대표 이승준 · 연락처 `070-8095-3075` · 사업장 서울특별시 동대문구 망우로109, 207호</p>
                        <p>② 개인정보 침해에 관한 신고나 상담이 필요한 경우 개인정보침해신고센터(privacy.kisa.or.kr / 국번없이 118), 대검찰청(1301), 경찰청(182)에 문의하실 수 있습니다.</p>
                    </section>

                    <p className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100">
                        공고일자: 2026년 11월 23일 <br />
                        시행일자: 2026년 11월 23일
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PrivacyPage;
