import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight, ShieldCheck, Zap, Sparkles, AlertCircle, User } from 'lucide-react';
import { createRoom } from '../lib/api.ts';
import { isFirebaseConfigured, missingKeys } from '../lib/firebase.ts';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('phong_chess_player_name') || '';
  });
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('phong_chess_player_name', name);
  };

  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      setErrorMessage(null);

      const res = await createRoom(playerName.trim() || undefined);
      if (res.success && res.roomId) {
        navigate(`/game/${res.roomId}`);
      } else {
        setErrorMessage(res.message || 'Không thể tạo phòng đấu');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
      setErrorMessage(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinById = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;

    let targetId = roomIdInput.trim();
    // Hỗ trợ dán cả URL ví dụ: http://localhost:5173/game/abc1234
    if (targetId.includes('/game/')) {
      const parts = targetId.split('/game/');
      targetId = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    if (targetId) {
      navigate(`/game/${targetId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 text-center">
      {/* Alert nếu chưa cấu hình Firebase */}
      {!isFirebaseConfigured && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-left flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-amber-200">Chưa nhận được biến môi trường Firebase!</h4>
            <p className="mt-1 text-slate-300 text-xs">
              Nếu đang xem trên Vercel, vui lòng vào <strong>Settings ➜ Environment Variables</strong>, chỉnh sửa các biến để tích chọn môi trường <strong>Production</strong> rồi bấm <strong>Redeploy</strong>.
            </p>
            {missingKeys.length > 0 && (
              <p className="mt-2 text-xs font-mono text-amber-400 bg-slate-900/80 p-2 rounded-lg border border-amber-500/20">
                Đang thiếu: {missingKeys.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Cờ Vua Trực Tuyến 2 Người Thời Gian Thực</span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
        Phong Chess <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Online</span>
      </h1>

      <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
        Tạo phòng thi đấu, gửi link mời bạn bè và bắt đầu ván cờ ngay lập tức. Xác thực ẩn danh bảo mật, đồng bộ nước đi siêu tốc qua Firebase & Vercel.
      </p>

      {/* Main Action Box */}
      <div className="mt-10 max-w-md mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-left">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          {/* Tên người chơi */}
          <div className="text-left bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <User className="w-3.5 h-3.5" />
                Tên hiển thị của bạn
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Tối đa 20 ký tự</span>
            </label>
            <input
              type="text"
              maxLength={20}
              placeholder="Nhập tên của bạn (ví dụ: Phong, Kiệt, Đại sư...)"
              value={playerName}
              onChange={(e) => handlePlayerNameChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            <Crown className="w-5 h-5 fill-slate-950" />
            {isCreating ? 'Đang khởi tạo phòng...' : 'Tạo phòng mới (Quân Trắng)'}
          </button>

          <div className="relative flex items-center justify-center py-2">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-900 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Hoặc tham gia phòng
            </span>
          </div>

          <form onSubmit={handleJoinById} className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập mã phòng hoặc link..."
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!roomIdInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-colors border border-slate-700 disabled:opacity-50"
            >
              <span>Vào</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
            <Crown className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Quân Trắng & Đen Tự Động</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Người tạo phòng cầm quân Trắng đi trước. Người tham gia qua link công khai tự động nhận quân Đen.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Đồng Bộ Thời Gian Thực</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Cloud Firestore onSnapshot cập nhật từng nước đi hai chiều với độ trễ tối thiểu và tự khôi phục khi tải lại trang.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Bảo Mật Server-side</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Kiểm tra luật cờ vua, đúng lượt và giao dịch Firestore Transaction ngăn chặn gian lận và ghi đè nước đi đồng thời.
          </p>
        </div>
      </div>
    </div>
  );
};
