import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRemoteJWKSet } from 'jose';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const report: Record<string, unknown> = {
    timestamp: Date.now(),
    env: {
      hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
      hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    },
  };

  try {
    let pk = process.env.FIREBASE_PRIVATE_KEY || '';
    let trimmed = pk.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      trimmed = trimmed.slice(1, -1).trim();
    }
    if (trimmed.includes('\\n')) {
      trimmed = trimmed.replace(/\\n/g, '\n');
    }

    const app = getApps().length > 0 ? getApp() : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: trimmed,
      }),
    });
    report.app = 'ok';

    const db = getFirestore(app);
    report.firestore = 'ok';

    // Test write and delete
    await db.collection('test').doc('live-check').set({ ping: true, time: Date.now() });
    report.firestoreWrite = 'ok';
    await db.collection('test').doc('live-check').delete();
    report.firestoreDelete = 'ok';

    // Test JWKS
    createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
    report.jwks = 'ok';

    report.status = '100% SUCCESS';
  } catch (err: unknown) {
    report.error = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  return res.status(200).json(report);
}
