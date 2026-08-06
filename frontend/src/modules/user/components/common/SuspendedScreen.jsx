import React from 'react';
import { BiBlock, BiChevronRight, BiShieldX, BiHeadphone } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

const SuspendedScreen = ({ reason }) => {
  const navigate = useNavigate();

  const handleGoToSupport = () => {
    navigate('/settings/support');
  };

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen bg-[#0f0f12] text-white flex items-center justify-center p-4 font-sans select-none overflow-hidden">
      {/* Background ambient red glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm flex flex-col items-center text-center z-10 px-2 animate-fade-in">
        {/* Icon Badge */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/5">
            <BiShieldX size={44} className="text-[#fe2c55]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#fe2c55] rounded-full flex items-center justify-center border-2 border-[#0f0f12]">
            <BiBlock size={15} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
          Account Suspended
        </h1>

        {/* Message */}
        <p className="text-sm text-gray-400 leading-relaxed mb-6 px-2">
          Your account has been suspended for violating our community guidelines. If you believe this is a mistake, please reach out to <button type="button" onClick={handleGoToSupport} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-[#fe2c55]/15 text-[#fe2c55] font-bold border border-[#fe2c55]/30 hover:bg-[#fe2c55]/25 transition-colors cursor-pointer">Support</button>.
        </p>

        {/* Reason Box */}
        {reason && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 text-left shadow-inner">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              Reason for Suspension
            </p>
            <p className="text-sm font-medium text-red-200 leading-snug">
              {reason}
            </p>
          </div>
        )}

        {/* Highlighted Primary Action Button */}
        <button
          type="button"
          onClick={handleGoToSupport}
          className="w-full group relative flex items-center justify-between bg-gradient-to-r from-[#fe2c55] to-[#e0244d] hover:from-[#e0244d] hover:to-[#c91c41] text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-[#fe2c55]/25 active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden border border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BiHeadphone size={22} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Have Questions?</div>
              <div className="text-base font-extrabold leading-tight">Contact Support</div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-white/90 group-hover:translate-x-1 transition-transform">
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">Help</span>
            <BiChevronRight size={20} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default SuspendedScreen;
