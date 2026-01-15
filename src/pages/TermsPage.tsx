import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TermsPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar
                onLoginClick={() => window.location.href = '/'}
                onSignupClick={() => window.location.href = '/'}
                onFortuneClick={async () => { }}
                onMbtiSajuClick={() => { }}
            />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-3xl font-bold mb-8">이용약관</h1>
                <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
                    <p>제1조 (목적)<br />본 약관은 MBTIJU(이하 "회사")가 제공하는 서비스의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.</p>
                    <p>제2조 (용어의 정의)<br />(이곳에 용어 정의가 들어갑니다.)</p>
                    <p>제3조 (약관의 게시와 개정)<br />회사는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</p>
                    <p className="text-sm text-slate-400 mt-8">(본 내용은 예시이며, 실제 서비스 운영을 위해서는 법률 전문가의 검토를 받은 정식 약관으로 대체해야 합니다.)</p>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default TermsPage;
