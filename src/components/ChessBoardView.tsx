import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard, defaultPieces, type PieceRenderObject } from 'react-chessboard';
import type { PlayerColor } from '../types/chess.ts';
import { soundManager } from '../lib/sound.ts';

interface ChessBoardViewProps {
  fen: string;
  turn: PlayerColor;
  orientation: 'white' | 'black';
  isPlayerTurn: boolean;
  canPlay: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove: (move: { from: string; to: string; promotion?: string }) => Promise<boolean>;
}

export const ChessBoardView: React.FC<ChessBoardViewProps> = ({
  fen,
  orientation,
  canPlay,
  lastMove,
  onMove,
}) => {
  // Instance chess.js để tính toán nước đi hợp lệ trên giao diện client
  const game = useMemo(() => new Chess(fen), [fen]);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [possibleSquares, setPossibleSquares] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Âm thanh khi nước đi mới xuất hiện từ Firestore
  useEffect(() => {
    if (game.inCheck()) {
      soundManager.playCheck();
    }
  }, [fen, game]);

  // Tìm ô của Vua đang bị chiếu (nếu có)
  const checkedKingSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    const currentTurn = game.turn();
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === currentTurn) {
          return piece.square;
        }
      }
    }
    return null;
  }, [game]);

  // Lấy danh sách các nước đi khả dĩ của 1 ô
  const getMoveOptions = useCallback((square: Square) => {
    const moves = game.moves({
      square,
      verbose: true,
    });
    const squares = moves.map((m) => m.to);
    setPossibleSquares(squares);
    return squares;
  }, [game]);

  const handleExecuteMove = useCallback(
    async (sourceSquare: string, targetSquare: string, pieceName?: string) => {
      if (!canPlay || isSubmitting) return false;

      // Kiểm tra phong cấp tốt
      const isPawnPromotion =
        (pieceName?.toLowerCase().includes('p') || game.get(sourceSquare as Square)?.type === 'p') &&
        ((targetSquare.endsWith('8') && orientation === 'white') ||
         (targetSquare.endsWith('1') && orientation === 'black'));

      const promotion = isPawnPromotion ? 'q' : undefined;

      // Kiểm tra tính hợp lệ trên client trước
      const testGame = new Chess(game.fen());
      try {
        const valid = testGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion,
        });

        if (!valid) {
          setMoveFrom(null);
          setPossibleSquares([]);
          return false;
        }
      } catch {
        setMoveFrom(null);
        setPossibleSquares([]);
        return false;
      }

      setIsSubmitting(true);
      setMoveFrom(null);
      setPossibleSquares([]);

      const captured = game.get(targetSquare as Square) != null;

      try {
        const success = await onMove({
          from: sourceSquare,
          to: targetSquare,
          promotion,
        });

        if (success) {
          if (captured) {
            soundManager.playCapture();
          } else {
            soundManager.playMove();
          }
          return true;
        }
        return false;
      } catch (err) {
        console.error('Lỗi khi gửi nước đi:', err);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [canPlay, isSubmitting, game, orientation, onMove]
  );

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!canPlay || isSubmitting) return;

      // Nếu chưa chọn quân bắt đầu
      if (!moveFrom) {
        const piece = game.get(square as Square);
        // Chỉ cho phép click quân của bên mình
        if (piece && ((piece.color === 'w' && orientation === 'white') || (piece.color === 'b' && orientation === 'black'))) {
          setMoveFrom(square);
          getMoveOptions(square as Square);
        }
        return;
      }

      // Nếu click lại chính ô đó -> hủy chọn
      if (moveFrom === square) {
        setMoveFrom(null);
        setPossibleSquares([]);
        return;
      }

      // Nếu click vào một quân khác cùng phe -> đổi quân chọn
      const piece = game.get(square as Square);
      if (piece && piece.color === (orientation === 'white' ? 'w' : 'b')) {
        setMoveFrom(square);
        getMoveOptions(square as Square);
        return;
      }

      // Nếu click vào ô đích hợp lệ -> thực hiện nước đi
      if (possibleSquares.includes(square)) {
        handleExecuteMove(moveFrom, square);
      } else {
        setMoveFrom(null);
        setPossibleSquares([]);
      }
    },
    [canPlay, isSubmitting, moveFrom, game, orientation, possibleSquares, getMoveOptions, handleExecuteMove]
  );

  // Bộ quân cờ độ nét cao với hiệu ứng chiều sâu 3D (Drop Shadow) và độ tương phản tối ưu
  const customPieces = useMemo<PieceRenderObject>(() => {
    return Object.fromEntries(
      Object.entries(defaultPieces).map(([key, pieceFn]) => {
        const isWhite = key.startsWith('w');
        return [
          key,
          (props?: { fill?: string; square?: string; svgStyle?: React.CSSProperties }) => {
            const customSvgStyle: React.CSSProperties = {
              ...props?.svgStyle,
              filter: isWhite
                ? 'drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25))'
                : 'drop-shadow(0 3px 4px rgba(0, 0, 0, 0.65)) drop-shadow(0 1px 2px rgba(255, 255, 255, 0.2))',
              transform: 'scale(1.05)',
              transition: 'transform 0.15s ease',
            };
            return pieceFn({
              ...props,
              fill: isWhite ? '#ffffff' : '#262421',
              svgStyle: customSvgStyle,
            });
          },
        ];
      })
    );
  }, []);

  // Tính styles tùy biến cho các ô: nước đi gần nhất, ô đang chọn, ô có thể đi, Vua bị chiếu
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight ô nước đi trước (giao diện vàng kim sang trọng)
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: 'rgba(234, 179, 8, 0.28)',
      };
      styles[lastMove.to] = {
        backgroundColor: 'rgba(234, 179, 8, 0.42)',
      };
    }

    // Highlight ô đang chọn (viền xanh sapphire tinh tế)
    if (moveFrom) {
      styles[moveFrom] = {
        backgroundColor: 'rgba(59, 130, 246, 0.45)',
        boxShadow: 'inset 0 0 0 3px rgba(96, 165, 250, 0.9)',
      };
    }

    // Highlight ô có thể di chuyển đến: chấm xanh cho ô trống, vòng tròn đỏ cho ô ăn quân
    for (const sq of possibleSquares) {
      const hasPiece = game.get(sq as Square) != null;
      styles[sq] = {
        background: hasPiece
          ? 'radial-gradient(circle, transparent 56%, rgba(239, 68, 68, 0.6) 60%, rgba(239, 68, 68, 0.85) 76%, transparent 80%)'
          : 'radial-gradient(circle, rgba(16, 185, 129, 0.75) 24%, transparent 28%)',
        cursor: 'pointer',
      };
    }

    // Highlight ô Vua bị chiếu
    if (checkedKingSquare) {
      styles[checkedKingSquare] = {
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        boxShadow: '0 0 16px rgba(239, 68, 68, 0.95)',
      };
    }

    return styles;
  }, [lastMove, moveFrom, possibleSquares, checkedKingSquare, game]);

  return (
    <div className="w-full max-w-[540px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800/90 bg-slate-950 relative ring-2 ring-amber-500/10">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: canPlay && !isSubmitting,
          pieces: customPieces,
          showNotation: true,
          darkSquareNotationStyle: { color: '#ebecd0', fontWeight: 'bold', fontSize: '11px' },
          lightSquareNotationStyle: { color: '#779952', fontWeight: 'bold', fontSize: '11px' },
          onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
            if (!canPlay || isSubmitting || !targetSquare) return false;
            handleExecuteMove(sourceSquare, targetSquare, piece.pieceType);
            return true;
          },
          onSquareClick: ({ square }) => {
            handleSquareClick(square);
          },
          squareStyles: customSquareStyles,
          darkSquareStyle: { backgroundColor: '#779952' },
          lightSquareStyle: { backgroundColor: '#edeed1' },
          boardStyle: {
            borderRadius: '0.75rem',
            boxShadow: '0 12px 30px -6px rgba(0, 0, 0, 0.6)',
          },
        }}
      />
    </div>
  );
};
