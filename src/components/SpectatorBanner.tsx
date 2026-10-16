import { Eye } from 'lucide-react';

export const SpectatorBanner: React.FC = () => {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 text-left">
      <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
        <Eye className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <span>Chế độ Khán giả (Spectator)</span>
        </div>
        <p className="text-xs text-slate-300 mt-0.5">
          Phòng đấu đã đủ 2 kỳ thủ (Trắng & Đen). Bạn đang theo dõi trực tiếp các nước đi được đồng bộ qua Cloud Firestore.
        </p>
      </div>
    </div>
  );
};
