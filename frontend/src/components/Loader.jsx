import React from 'react';

const Loader = ({ message = 'Loading SSES Portal...', inline = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 fade-in text-center p-4">
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 rounded-full border-4 border-orange-200 animate-ping absolute opacity-30 pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-[3px] border-slate-200 border-t-orange-500 border-r-amber-500 animate-spin" />
        <div className="w-2.5 h-2.5 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-full absolute shadow-xs" />
      </div>
      <div className="space-y-0.5">
        <p className="text-slate-800 font-extrabold text-sm tracking-tight">{message}</p>
        <p className="text-[11px] font-semibold text-slate-400">Sant Singaji Educational Society</p>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="w-full min-h-[260px] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] fade-in">
      <div className="bg-white/95 backdrop-blur-md px-8 py-6 rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full mx-4">
        {content}
      </div>
    </div>
  );
};

export default Loader;
