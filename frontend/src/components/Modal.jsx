import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen = true, onClose, children, className = '' }) => {
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scrolling when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className={`modal-backdrop-fixed flex items-center justify-center p-4 fade-in ${className}`}>
      {children}
    </div>,
    document.body
  );
};

export default Modal;
