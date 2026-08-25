import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ShieldCheck, Zap, Award, Flame, AlertTriangle, Users, CheckCircle2, HelpCircle } from 'lucide-react';

export const RulesPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17] text-slate-100">
      <Navbar />

      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wider uppercase mb-3">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>OFFICIAL EVENT RULEBOOK</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">ELECTROBIT Rules & Guidelines</h1>
          <p className="text-slate-400 text-base mt-2">
            The EEE Auction Challenge Rules governing Bidding, Scoring, Timers, and Tie-Breakers.
          </p>
        </div>

        <div className="space-y-8">
          {/* Section 1: Team Composition & Starting Balance */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">1. Team Composition & Starting Points</h2>
            </div>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span><strong>Team Size:</strong> Maximum of 2 participants per team.</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span><strong>Starting Points:</strong> Every registered team is allocated an initial balance of <strong>10,000 points</strong> upon registration.</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span><strong>No Account Login:</strong> Teams register prior to the event. Bids are submitted verbally to the host and entered into the system by the Administrator.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: Live Auction & Bidding Rules */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">2. Bidding Rules</h2>
            </div>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span><strong>Minimum Increment:</strong> Every new bid must exceed the current highest bid by a minimum of <strong>100 points</strong>.</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span><strong>Point Balance Limit:</strong> A team cannot place a bid that exceeds their current total point balance.</span>
              </li>
              <li className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span><strong>Bidding Timer:</strong> Bidding remains open for <strong>30 seconds</strong> per question or until the host closes bidding.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Question Evaluation & Scoring Logic */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">3. Answer Evaluation & Bid Deduction Logic</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-green-400 mb-2">✅ Correct Answer</h3>
                <p className="text-xs text-slate-300">
                  The winning bid is <strong>DEDUCTED</strong> (spent to win auction) and Question Base Points are <strong>ADDED</strong>.
                </p>
                <div className="mt-2 text-sm font-mono text-green-300 font-bold">
                  Score = Previous Balance - Winning Bid + Base Points
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-red-400 mb-2">❌ Wrong Answer</h3>
                <p className="text-xs text-slate-300">
                  The winning bid is <strong>DEDUCTED</strong> from the winning team's balance (0 question base points earned).
                </p>
                <div className="mt-2 text-sm font-mono text-red-300 font-bold">
                  Score = Previous Balance - Winning Bid
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span><strong>No Negative Score:</strong> A team's score can never drop below 0 points. Minimum possible score is 0.</span>
            </div>
          </div>

          {/* Section 4: Difficulty Levels */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
                <Flame className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">4. Difficulty Tiers & Base Values</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-slate-900 rounded-xl border border-green-500/30">
                <div className="font-bold text-green-400 text-sm">🟢 EASY</div>
                <div className="text-xl font-black text-white mt-1">100 PTS</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-xl border border-yellow-500/30">
                <div className="font-bold text-yellow-400 text-sm">🟡 MEDIUM</div>
                <div className="text-xl font-black text-white mt-1">300 PTS</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-xl border border-red-500/30">
                <div className="font-bold text-red-400 text-sm">🔴 HARD</div>
                <div className="text-xl font-black text-white mt-1">500 PTS</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-xl border border-purple-500/30">
                <div className="font-bold text-purple-400 text-sm">⚡ SUPER</div>
                <div className="text-xl font-black text-white mt-1">1000 PTS</div>
              </div>
            </div>
          </div>

          {/* Section 5: Tie-Breaking Rules & Admin Authority */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">5. Tie-Breaker Rules & Admin Authority</h2>
            </div>
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                In the event of a tie in points at the conclusion of the event:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 font-semibold">
                <li>The team with the higher number of <strong>Correct Answers</strong> wins.</li>
                <li>If still tied, the team that reached the final point balance <strong>earlier in time</strong> wins.</li>
              </ol>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 mt-4">
                <strong className="text-white">Admin Control:</strong> The Event Administrator holds sole and final authority regarding bid acceptance, question selection, answer correctness, and event state management.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
