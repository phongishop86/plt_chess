import type { VercelRequest } from '@vercel/node';
import { adminAuth } from './firebase-admin.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

/**
 * Trích xuất và xác thực Firebase ID Token từ header Authorization
 * Ném lỗi nếu token không hợp lệ hoặc thiếu
 */
export async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    throw new Error('Thiếu header Authorization xác thực');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('Định dạng token không đúng (Yêu cầu: Bearer <ID_TOKEN>)');
  }

  const idToken = parts[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Token không hợp lệ hoặc đã hết hạn';
    console.error('[Auth Middleware] Lỗi verifyIdToken:', message);
    throw new Error('Xác thực thất bại: ' + message);
  }
}
