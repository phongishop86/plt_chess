import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
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

  // Tính styles tùy biến cho các ô: nước đi gần nhất, ô đang chọn, ô có thể đi, Vua bị chiếu
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight ô nước đi trước
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: 'rgba(234, 179, 8, 0.25)',
      };
      styles[lastMove.to] = {
        backgroundColor: 'rgba(234, 179, 8, 0.35)',
      };
    }

    // Highlight ô đang chọn
    if (moveFrom) {
      styles[moveFrom] = {
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      };
    }

    // Highlight ô có thể di chuyển đến
    for (const sq of possibleSquares) {
      const hasPiece = game.get(sq as Square) != null;
      styles[sq] = {
        background: hasPiece
          ? 'radial-gradient(circle, rgba(239, 68, 68, 0.7) 80%, transparent 85%)'
          : 'radial-gradient(circle, rgba(34, 197, 94, 0.6) 25%, transparent 28%)',
        borderRadius: '50%',
        cursor: 'pointer',
      };
    }

    // Highlight ô Vua bị chiếu
    if (checkedKingSquare) {
      styles[checkedKingSquare] = {
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)',
      };
    }

    return styles;
  }, [lastMove, moveFrom, possibleSquares, checkedKingSquare, game]);

  return (
    <div className="w-full max-w-[540px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-900 relative">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: canPlay && !isSubmitting,
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
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          },
        }}
      />
    </div>
  );
};
