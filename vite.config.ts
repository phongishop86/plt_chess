import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';
import path from 'path';

// Nạp các biến môi trường từ .env.local vào process.env cho backend Firebase Admin khi chạy local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

/**
 * Plugin giả lập Vercel Serverless Functions trong môi trường Vite dev server
 * Cho phép /api/* chạy mượt mà ngay trên http://localhost:5173 mà không cần cài thêm công cụ ngoài
 */
const vercelApiDevPlugin = (): Plugin => ({
  name: 'vercel-api-dev',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0];
      if (url?.startsWith('/api/')) {
        const routeName = url.replace('/api/', '');
        const validRoutes = ['create-room', 'join-room', 'make-move', 'resign'];

        if (validRoutes.includes(routeName)) {
          try {
            // Đọc body dữ liệu của request
            let body = {};
            if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
              const buffers: Buffer[] = [];
              for await (const chunk of req) {
                buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              const rawBody = Buffer.concat(buffers).toString('utf-8');
              if (rawBody.trim()) {
                try {
                  body = JSON.parse(rawBody);
                } catch {
                  body = {};
                }
              }
            }

            // Giả lập giao diện VercelRequest và VercelResponse
            const vercelReq = Object.assign(req, { body });
            const vercelRes = Object.assign(res, {
              status(statusCode: number) {
                res.statusCode = statusCode;
                return vercelRes;
              },
              json(jsonData: unknown) {
                if (!res.headersSent) {
                  res.setHeader('Content-Type', 'application/json');
                }
                res.end(JSON.stringify(jsonData));
                return vercelRes;
              },
            });

            // Nạp động file API TypeScript qua Vite ssrLoadModule
            const module = await server.ssrLoadModule(`./api/${routeName}.ts`);
            return await module.default(vercelReq, vercelRes);
          } catch (err: unknown) {
            console.error(`[API Dev Error] /api/${routeName}:`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const message = err instanceof Error ? err.message : 'Internal Server Error';
            return res.end(JSON.stringify({ success: false, message }));
          }
        }
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), vercelApiDevPlugin()],
});
