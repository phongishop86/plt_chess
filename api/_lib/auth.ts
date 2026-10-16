import type { VercelRequest } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

function cleanEnv(val: unknown): string {
  if (typeof val !== 'string') return '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Xác thực Firebase ID Token an toàn tuyệt đối bằng chuẩn Google JWKS
 * Sử dụng thư viện jose chuẩn ESM/Serverless, không bị lỗi CommonJS ERR_REQUIRE_ESM
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
  const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);

  if (!projectId) {
    throw new Error('Máy chủ chưa nhận được biến môi trường FIREBASE_PROJECT_ID');
  }

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub) {
      throw new Error('Token không chứa user id hợp lệ');
    }

    return {
      uid: payload.sub,
      email: payload.email as string | undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Token không hợp lệ hoặc đã hết hạn';
    console.error('[Auth Middleware] Lỗi verifyIdToken:', message);
    throw new Error('Xác thực thất bại: ' + message);
  }
}
