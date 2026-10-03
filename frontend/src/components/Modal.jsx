import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen = true, onClose, children, className = '' }) => {
  useEffect(() => {
    // Ensure body scroll is never locked
    document.body.style.overflow = 'unset';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`modal-backdrop-fixed fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/65 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-start sm:items-center min-h-screen fade-in ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="my-auto w-full max-w-full flex justify-center py-4">
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
