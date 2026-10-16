import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from '../src/lib/server-admin';

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
    const db = getAdminDb();
    report.firestore = 'ok';

    // Test write and delete
    await db.collection('test').doc('live-check').set({ ping: true, time: Date.now() });
    report.firestoreWrite = 'ok';
    await db.collection('test').doc('live-check').delete();
    report.firestoreDelete = 'ok';

    report.status = '100% READY AND OPERATIONAL';
  } catch (err: unknown) {
    report.error = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  return res.status(200).json(report);
}
