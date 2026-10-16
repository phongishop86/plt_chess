import { getIdToken } from './firebase.ts';
import type { 
  CreateRoomResponse, 
  JoinRoomResponse, 
  MakeMoveResponse, 
  ResignResponse 
} from '../types/chess.ts';

const API_BASE = '/api';

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = '';
  try {
    token = await getIdToken();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Không thể xác thực';
    throw new Error('Chưa thể lấy token xác thực Firebase: ' + message);
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Lỗi yêu cầu máy chủ: ${response.status}`);
  }

  return data as T;
}

/**
 * Tạo phòng cờ mới (Người tạo tự động nhận ghế quân Trắng)
 */
export async function createRoom(): Promise<CreateRoomResponse> {
  return fetchWithAuth<CreateRoomResponse>('/create-room', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Tham gia phòng cờ (Nếu ghế Đen trống -> nhận ghế Đen; nếu đủ 2 người -> khán giả)
 */
export async function joinRoom(roomId: string): Promise<JoinRoomResponse> {
  return fetchWithAuth<JoinRoomResponse>('/join-room', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  });
}

/**
 * Thực hiện nước đi qua server xác thực & Firestore transaction
 */
export async function makeMove(
  roomId: string,
  move: { from: string; to: string; promotion?: string }
): Promise<MakeMoveResponse> {
  return fetchWithAuth<MakeMoveResponse>('/make-move', {
    method: 'POST',
    body: JSON.stringify({ roomId, move }),
  });
}

/**
 * Xin đầu hàng qua server
 */
export async function resignGame(roomId: string): Promise<ResignResponse> {
  return fetchWithAuth<ResignResponse>('/resign', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  });
}
