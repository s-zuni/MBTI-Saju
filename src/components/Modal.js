import React from 'react';

const Modal = ({ children, showModal, closeAllModals }) => {
  if (!showModal) {
    return null;
  }

  return (
    <div id="modalOverlay" className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAllModals}></div>
      <div id="modalContent" className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-fade-in">
        {children}
      </div>
    </div>
  );
};

export default Modal;