import React, { useState } from 'react';
import { Crown, HelpCircle, User as UserIcon, X, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../lib/sound.ts';

interface NavbarProps {
  currentUid?: string | null;
  onNewGame?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUid }) => {
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const toggleSound = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group cursor-pointer text-left">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Crown className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wide text-white group-hover:text-amber-400 transition-colors">
                PHONG CHESS
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Online
              </span>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSound}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors border border-slate-700/50"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Luật & Trợ giúp</span>
            </button>

            {currentUid && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs font-mono text-slate-300">
                <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline text-slate-400">UID:</span>
                <span>{currentUid.slice(0, 6)}...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal hướng dẫn luật cờ */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              Hướng dẫn & Luật chơi Phong Chess
            </h3>

            <div className="space-y-3 text-sm text-slate-300 max-h-[70vh] overflow-y-auto pr-2">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                <h4 className="font-semibold text-amber-400 mb-1">1. Cơ chế phòng đấu</h4>
                <p>
                  • Người tạo phòng mặc định cầm <strong className="text-white">quân Trắng</strong> và đi trước.
                </p>
                <p>
                  • Đối thủ nhấp vào liên kết phòng sẽ tự động nhận <strong className="text-white">quân Đen</strong>.
                </p>
                <p>
                  • Người thứ 3 trở đi vào xem với tư cách <strong className="text-white">khán giả (Spectator)</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                <h4 className="font-semibold text-amber-400 mb-1">2. Xác thực & Bảo mật máy chủ</h4>
                <p>
                  • Đăng nhập ẩn danh tự động qua Firebase Auth (không yêu cầu mật khẩu).
                </p>
                <p>
                  • Mọi nước đi được máy chủ xác thực qua Firebase Admin và kiểm tra luật bằng Chess.js.
                </p>
                <p>
                  • Đồng bộ thời gian thực 2 chiều qua Cloud Firestore.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                <h4 className="font-semibold text-amber-400 mb-1">3. Luật cờ vua chuẩn FIDE</h4>
                <p>
                  • Hỗ trợ đầy đủ: Nhập thành (Castling), Bắt tốt qua đường (En Passant), Phong cấp tốt (Promotion sang Hậu/Xe/Tượng/Mã).
                </p>
                <p>
                  • Tự động phát hiện Chiếu tướng, Chiếu bí (Checkmate), Hòa cờ (Stalemate, Không đủ lực lượng, Lặp lại 3 lần).
                </p>
              </div>
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setShowRules(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
