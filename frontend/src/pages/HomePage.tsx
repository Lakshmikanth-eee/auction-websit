import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Zap, Trophy, ShieldCheck, Monitor, UserPlus, LogIn, Flame, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17] text-slate-100 selection:bg-cyan-500 selection:text-black">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-8 shadow-lg shadow-cyan-500/10">
            <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span>COLLEGE EEE TECHNICAL SYMPOSIUM FLAGSHIP EVENT</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white mb-4">
            ⚡ ELECTROBIT
          </h1>
          <p className="text-2xl sm:text-4xl font-extrabold tracking-wider text-cyan-400 uppercase mb-6">
            THE EEE AUCTION CHALLENGE
          </p>

          <p className="text-xl sm:text-2xl font-bold italic text-yellow-300 mb-10 tracking-wide">
            "Bid Smart. Answer Fast. Win Big."
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center space-x-2 px-8 py-4 rounded-xl text-lg font-extrabold text-black bg-gradient-to-r from-cyan-400 via-cyan-300 to-yellow-400 hover:from-cyan-300 hover:to-yellow-300 shadow-xl shadow-cyan-500/25 hover:scale-105 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              <span>REGISTER YOUR TEAM</span>
            </Link>

            <Link
              to="/login"
              className="flex items-center space-x-2 px-8 py-4 rounded-xl text-lg font-extrabold text-white bg-slate-800 border-2 border-yellow-500/50 hover:bg-slate-700 hover:border-yellow-400 shadow-xl shadow-yellow-500/10 hover:scale-105 transition-all"
            >
              <LogIn className="w-5 h-5 text-yellow-400" />
              <span>TEAM LOGIN</span>
            </Link>

            <Link
              to="/leaderboard"
              className="flex items-center space-x-2 px-6 py-4 rounded-xl text-lg font-bold text-slate-200 bg-slate-900/80 border border-slate-700 hover:bg-slate-800 transition-all"
            >
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>LEADERBOARD</span>
            </Link>

            <Link
              to="/rules"
              className="flex items-center space-x-2 px-6 py-4 rounded-xl text-lg font-bold text-slate-200 bg-slate-900/80 border border-slate-700 hover:bg-slate-800 transition-all"
            >
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>EVENT RULES</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT ELECTROBIT */}
      <section className="py-16 bg-[#0d1322] border-y border-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm tracking-wider uppercase mb-2">
                <Cpu className="w-5 h-5" />
                <span>ABOUT ELECTROBIT</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
                High-Voltage Technical Bidding Competition
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-4">
                <strong className="text-cyan-400">ELECTROBIT</strong> is the ultimate Electrical & Electronics Engineering challenge combining deep domain knowledge with high-stakes auction strategy.
              </p>
              <p className="text-slate-400 text-base leading-relaxed mb-6">
                Every registered team starts with <strong className="text-yellow-400">10,000 starting points</strong>. Teams bid live in real-time against each other for high-value technical questions. Winning the auction deducts your bid amount from your balance, while answering correctly earns the question's base points!
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-2xl font-black text-yellow-400">10,000</div>
                  <div className="text-xs text-slate-400 font-semibold">Starting Points per Team</div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-2xl font-black text-cyan-400">2 Members</div>
                  <div className="text-xs text-slate-400 font-semibold">Maximum Team Size</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Host Bidding</h3>
                <p className="text-xs text-slate-400">Real-time host-driven bidding system synced across all displays.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Live Standings</h3>
                <p className="text-xs text-slate-400">Instant score updates without page refresh after every question.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Flame className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">4 Difficulty Tiers</h3>
                <p className="text-xs text-slate-400">Easy (100) to Super Challenge (1000) question bank.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Monitor className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">16:9 Projector</h3>
                <p className="text-xs text-slate-400">Dedicated high-res hall screen mode for the live audience.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFFICULTY LEVELS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-cyan-400 font-bold text-xs tracking-widest uppercase">QUESTION VALUE TIERS</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Difficulty Levels & Base Points</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-green-500/30 hover:border-green-500 transition-all glow-green">
            <div className="text-3xl font-black text-green-400 mb-2">🟢 EASY</div>
            <div className="text-4xl font-extrabold text-white mb-3">100 <span className="text-sm font-normal text-slate-400">PTS</span></div>
            <p className="text-xs text-slate-300">Fundamental electrical circuits, formulas, units, and basic component physics.</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/90 border border-yellow-500/30 hover:border-yellow-500 transition-all glow-yellow">
            <div className="text-3xl font-black text-yellow-400 mb-2">🟡 MEDIUM</div>
            <div className="text-4xl font-extrabold text-white mb-3">300 <span className="text-sm font-normal text-slate-400">PTS</span></div>
            <p className="text-xs text-slate-300">AC/DC machines, power system analysis, semiconductor drives, and control theory.</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/90 border border-red-500/30 hover:border-red-500 transition-all glow-red">
            <div className="text-3xl font-black text-red-400 mb-2">🔴 HARD</div>
            <div className="text-4xl font-extrabold text-white mb-3">500 <span className="text-sm font-normal text-slate-400">PTS</span></div>
            <p className="text-xs text-slate-300">Transient stability, protective relaying, inverter topologies, and state space math.</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/90 border border-purple-500/40 hover:border-purple-400 transition-all shadow-lg shadow-purple-500/20">
            <div className="text-3xl font-black text-purple-400 mb-2">⚡ SUPER</div>
            <div className="text-4xl font-extrabold text-white mb-3">1000 <span className="text-sm font-normal text-slate-400">PTS</span></div>
            <p className="text-xs text-slate-300">High-risk derivation challenges, HVDC faults, SVPWM, and subsynchronous resonance.</p>
          </div>
        </div>
      </section>

      {/* EVENT FLOW & HOW IT WORKS */}
      <section className="py-16 bg-[#0d1322] border-t border-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-yellow-400 font-bold text-xs tracking-widest uppercase">STEP-BY-STEP PROCESS</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">How Electrobit Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 relative">
              <div className="text-xs font-bold text-cyan-400 mb-2">STEP 1</div>
              <h3 className="text-xl font-bold text-white mb-2">Team Registration</h3>
              <p className="text-xs text-slate-400">Register your team of up to 2 participants online. No login accounts required. Get your unique Registration Number.</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 relative">
              <div className="text-xs font-bold text-yellow-400 mb-2">STEP 2</div>
              <h3 className="text-xl font-bold text-white mb-2">Live Auction Bidding</h3>
              <p className="text-xs text-slate-400">Host announces question base points. Teams shout out bids. Admin updates highest bidder on live screen in 30s timer.</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 relative">
              <div className="text-xs font-bold text-purple-400 mb-2">STEP 3</div>
              <h3 className="text-xl font-bold text-white mb-2">30s Answer Phase</h3>
              <p className="text-xs text-slate-400">The winning bidder gets 30 seconds to answer the question verbally before the host and audience.</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 relative">
              <div className="text-xs font-bold text-green-400 mb-2">STEP 4</div>
              <h3 className="text-xl font-bold text-white mb-2">Score Update</h3>
              <p className="text-xs text-slate-400">Correct answer adds winning bid to score. Wrong answer deducts winning bid. Live leaderboard updates instantly!</p>
            </div>
          </div>

          {/* Quick Rules Summary */}
          <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-purple-950/40 border border-cyan-500/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to compete?</h3>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto mb-6">
              Gather your partner, review the event rules, and register your team to secure your place in the high-voltage arena.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl font-extrabold text-black bg-cyan-400 hover:bg-cyan-300 transition-all shadow-lg shadow-cyan-500/20"
            >
              <span>REGISTER NOW</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
