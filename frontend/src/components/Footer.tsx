import React from 'react';
import { Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#070a10] border-t border-cyan-500/10 py-12 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-wider">ELECTROBIT</span>
              <span className="block text-xs font-semibold text-cyan-400 tracking-widest">
                THE EEE AUCTION CHALLENGE
              </span>
            </div>
          </div>

          <div className="text-center md:text-right text-xs text-slate-500 space-y-1">
            <p>Department of Electrical & Electronics Engineering</p>
            <p>"Bid Smart. Answer Fast. Win Big."</p>
            <p className="pt-2 text-slate-600">© 2026 ELECTROBIT. All Rights Reserved. Admin-Controlled Event.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
