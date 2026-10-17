/**
 * Tính toán lực lượng, chênh lệch điểm (Material Score) và các quân cờ bị bắt từ chuỗi FEN
 */

export interface MaterialResult {
  whiteScore: number;
  blackScore: number;
  diff: number; // > 0: Bên Trắng dẫn trước, < 0: Bên Đen dẫn trước
  whiteAdvantage: number;
  blackAdvantage: number;
  capturedByWhite: string[]; // Các quân Đen bị Trắng bắt (chữ thường: q, r, b, n, p)
  capturedByBlack: string[]; // Các quân Trắng bị Đen bắt (chữ hoa: Q, R, B, N, P)
}

// Điểm chuẩn của các quân cờ
export const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Ký hiệu Unicode cho các quân cờ bị bắt
export const PIECE_UNICODE: Record<string, string> = {
  // Quân Đen
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
  // Quân Trắng
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
};

export function calculateMaterial(fen: string): MaterialResult {
  if (!fen) {
    return {
      whiteScore: 39,
      blackScore: 39,
      diff: 0,
      whiteAdvantage: 0,
      blackAdvantage: 0,
      capturedByWhite: [],
      capturedByBlack: [],
    };
  }

  const boardPart = fen.split(' ')[0] || '';
  const counts: Record<string, number> = {
    P: 0, N: 0, B: 0, R: 0, Q: 0,
    p: 0, n: 0, b: 0, r: 0, q: 0,
  };

  for (const ch of boardPart) {
    if (counts[ch] !== undefined) {
      counts[ch]++;
    }
  }

  // Số lượng khởi đầu tiêu chuẩn
  const initial: Record<string, number> = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1,
  };

  const capturedByWhite: string[] = [];
  const capturedByBlack: string[] = [];

  // Thứ tự hiển thị theo giá trị giảm dần: Hậu -> Xe -> Tượng -> Mã -> Tốt
  const pieceOrder = ['q', 'r', 'b', 'n', 'p'];

  for (const t of pieceOrder) {
    const missingBlack = Math.max(0, initial[t] - counts[t]);
    for (let i = 0; i < missingBlack; i++) {
      capturedByWhite.push(t);
    }

    const tUpper = t.toUpperCase();
    const missingWhite = Math.max(0, initial[t] - counts[tUpper]);
    for (let i = 0; i < missingWhite; i++) {
      capturedByBlack.push(tUpper);
    }
  }

  let whiteScore = 0;
  let blackScore = 0;

  for (const t of pieceOrder) {
    whiteScore += counts[t.toUpperCase()] * PIECE_VALUES[t];
    blackScore += counts[t] * PIECE_VALUES[t];
  }

  const diff = whiteScore - blackScore;

  return {
    whiteScore,
    blackScore,
    diff,
    whiteAdvantage: diff > 0 ? diff : 0,
    blackAdvantage: diff < 0 ? Math.abs(diff) : 0,
    capturedByWhite,
    capturedByBlack,
  };
}
