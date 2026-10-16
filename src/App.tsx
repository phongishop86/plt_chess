import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { GamePage } from './pages/GamePage.tsx';
import { ensureAnonymousUser } from './lib/firebase.ts';

export const App: React.FC = () => {
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    ensureAnonymousUser()
      .then((user) => setCurrentUid(user.uid))
      .catch(() => {
        // Có thể chưa cấu hình env hoặc đang offline
      });
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
        <Navbar currentUid={currentUid} />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game/:roomId" element={<GamePage />} />
            {/* Fallback route */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500">
          <p>Phong Chess Online • Phát triển bằng Google Antigravity, Firebase & Vercel</p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
