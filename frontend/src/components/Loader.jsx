import React from 'react';
import { FiLoader } from 'react-icons/fi';

const Loader = () => {
  return (
    <div className="modal-backdrop-fixed flex items-center justify-center fade-in">
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center gap-3">
        <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
          <FiLoader className="w-8 h-8 animate-spin" />
        </div>
        <p className="text-slate-800 font-extrabold text-sm tracking-wide">Processing...</p>
      </div>
    </div>
  );
};

export default Loader;
