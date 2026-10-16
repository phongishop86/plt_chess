import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const report: Record<string, unknown> = {
    timestamp: Date.now(),
    env: {
      hasProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
      hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      pkLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      pkStartsWithBegin: (process.env.FIREBASE_PRIVATE_KEY || '').includes('BEGIN PRIVATE KEY'),
    },
  };

  try {
    const adminApp = await import('firebase-admin/app');
    report.importAdminApp = 'ok';
    const adminAuth = await import('firebase-admin/auth');
    report.importAdminAuth = 'ok';
    const adminDb = await import('firebase-admin/firestore');
    report.importAdminDb = 'ok';

    let pk = process.env.FIREBASE_PRIVATE_KEY || '';
    let trimmed = pk.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      trimmed = trimmed.slice(1, -1).trim();
    }
    if (trimmed.includes('\\n')) {
      trimmed = trimmed.replace(/\\n/g, '\n');
    }

    try {
      const cred = adminApp.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: trimmed,
      });
      report.cert = 'ok';

      const app = adminApp.getApps().length > 0 ? adminApp.getApp() : adminApp.initializeApp({
        credential: cred,
      });
      report.appInit = 'ok';

      const db = adminDb.getFirestore(app);
      report.firestoreInit = 'ok';

      // Test ping document
      await db.collection('test').doc('debug-ping').set({ ok: true, t: Date.now() });
      report.firestoreWrite = 'ok';
      await db.collection('test').doc('debug-ping').delete();
      report.firestoreDelete = 'ok';
      report.status = 'ALL_SYSTEMS_OPERATIONAL';
    } catch (err: unknown) {
      report.initError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
    }
  } catch (err: unknown) {
    report.importError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
  }

  return res.status(200).json(report);
}
