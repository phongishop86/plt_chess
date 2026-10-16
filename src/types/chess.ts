export type PlayerColor = 'w' | 'b';

export type GameStatus = 
  | 'waiting'      // Đang chờ người chơi thứ 2 (quân Đen)
  | 'in_progress'  // Trận đấu đang diễn ra
  | 'checkmate'    // Chiếu hết
  | 'draw'         // Hòa cờ (hết nước đi, lặp lại, không đủ lực lượng...)
  | 'resigned'     // Đầu hàng
  | 'stalemate'    // Hòa do pat (không còn nước đi hợp lệ và không bị chiếu)
  | 'abandoned';   // Bỏ cuộc

export interface PlayerInfo {
  uid: string;
  name: string;
  connected?: boolean;
}

export interface MoveRecord {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  timestamp: number;
  by: PlayerColor;
}

export interface RoomDocument {
  roomId: string;
  createdAt: number;
  updatedAt: number;
  status: GameStatus;
  players: {
    white: PlayerInfo;
    black?: PlayerInfo | null;
  };
  turn: PlayerColor;
  fen: string;
  history: MoveRecord[];
  winner?: PlayerColor | 'draw' | null;
  resignedBy?: PlayerColor | null;
  lastMove?: {
    from: string;
    to: string;
    san: string;
  } | null;
}

export interface CreateRoomResponse {
  success: boolean;
  roomId: string;
  message?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  role: 'white' | 'black' | 'spectator';
  message?: string;
}

export interface MakeMoveRequest {
  roomId: string;
  move: {
    from: string;
    to: string;
    promotion?: string;
  };
}

export interface MakeMoveResponse {
  success: boolean;
  san?: string;
  fen?: string;
  isGameOver?: boolean;
  status?: GameStatus;
  winner?: PlayerColor | 'draw' | null;
  message?: string;
}

export interface ResignRequest {
  roomId: string;
}

export interface ResignResponse {
  success: boolean;
  message?: string;
}
