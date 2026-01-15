import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar
                onLoginClick={() => window.location.href = '/'}
                onSignupClick={() => window.location.href = '/'}
                onFortuneClick={async () => { }}
                onMbtiSajuClick={() => { }}
            />
            <div className="max-w-4xl mx-auto px-6 py-24">
                <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>
                <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
                    <p>1. 개인정보의 처리 목적<br />회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
                    <p>2. 개인정보의 처리 및 보유 기간<br />① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
                    <p>3. 정보주체의 권리, 의무 및 그 행사방법<br />이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
                    <p className="text-sm text-slate-400 mt-8">(본 내용은 예시이며, 실제 서비스 운영을 위해서는 법률 전문가의 검토를 받은 정식 처리방침으로 대체해야 합니다.)</p>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PrivacyPage;
