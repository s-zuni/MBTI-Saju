import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import Modal from './components/Modal';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import MyPageModal from './components/MyPageModal';
import { auth, db } from './firebase'; // Assuming you have firebase.js file
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState(''); // 'login', 'signup', 'my-page'
  const [user, setUser] = useState(null);
  const [myPageData, setMyPageData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const openModal = (view) => {
    setModalView(view);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalView('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.loginEmail.value;
    const password = e.target.loginPw.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeModal();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    // Signup logic here
    closeModal();
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const loadMyPage = async () => {
    if (user) {
      const docRef = doc(db, 'artifacts', 'mbtiju-app', 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMyPageData({
          profile: data.profile,
          saju: formatValue(data.result.saju),
          mbti: formatValue(data.result.mbti),
          trait: formatValue(data.result.trait),
          jobs: formatValue(data.result.jobs),
          match: formatValue(data.result.match),
        });
      }
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
        user={user}
        openLoginModal={() => openModal('login')}
        openSignupModal={() => openModal('signup')}
        openMyPageModal={() => {
          loadMyPage();
          openModal('my-page');
        }}
        handleLogout={handleLogout}
      />
      <HeroSection />
      <Footer />
      <Modal showModal={showModal} closeAllModals={closeModal}>
        {modalView === 'login' && (
          <LoginModal
            handleLogin={handleLogin}
            openSignupModal={() => openModal('signup')}
            closeAllModals={closeModal}
          />
        )}
        {modalView === 'signup' && (
          <SignupModal
            handleSignup={handleSignup}
            openLoginModal={() => openModal('login')}
            closeAllModals={closeModal}
          />
        )}
        {modalView === 'my-page' && (
          <MyPageModal
            closeAllModals={closeModal}
            myPageData={myPageData}
          />
        )}
      </Modal>
    </div>
  );
}

export default App;
