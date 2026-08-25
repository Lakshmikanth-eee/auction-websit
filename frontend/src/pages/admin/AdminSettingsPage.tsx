import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { fetchAPI } from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { Settings, Zap, Printer, CheckCircle2, ShieldCheck, Play, Pause, Award } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    eventName: 'ELECTROBIT',
    eventSubtitle: 'THE EEE AUCTION CHALLENGE',
    eventStatus: 'NOT_STARTED',
    startingPoints: 5000,
    minBidIncrement: 100,
    biddingTimerDefault: 30,
    answerTimerDefault: 30,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = async () => {
    try {
      const res = await fetchAPI('/settings');
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdateStatus = async (status: string) => {
    try {
      const res = await fetchAPI('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ eventStatus: status }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: `Event status updated to: ${status}` });
        setSettings(res.settings);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchAPI('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Event settings saved successfully.' });
        setSettings(res.settings);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const registrationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/register`
    : 'http://localhost:5173/register';

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Settings className="w-8 h-8 text-cyan-400" />
            <span>Event Control Settings & QR Code</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global event status control, default timers, starting balance, and printable registration QR code.
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        {/* EVENT STATUS CONTROL */}
        <div className="bg-[#0d1424] border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span>Global Event Lifecycle Control</span>
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Changing event status updates live display behavior across all connected projector screens.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <button
              onClick={() => handleUpdateStatus('NOT_STARTED')}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                settings.eventStatus === 'NOT_STARTED'
                  ? 'bg-slate-800 border-cyan-400 text-cyan-400 ring-2 ring-cyan-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-sm font-extrabold mb-1">⏳ NOT STARTED</div>
              <span>Event setup & registration phase</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('IN_PROGRESS')}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                settings.eventStatus === 'IN_PROGRESS'
                  ? 'bg-green-500/20 border-green-400 text-green-400 ring-2 ring-green-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-sm font-extrabold mb-1">🚀 IN PROGRESS</div>
              <span>Active live bidding in progress</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('PAUSED')}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                settings.eventStatus === 'PAUSED'
                  ? 'bg-yellow-500/20 border-yellow-400 text-yellow-400 ring-2 ring-yellow-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-sm font-extrabold mb-1">⏸ PAUSED</div>
              <span>Temporary event break</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('COMPLETED')}
              className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                settings.eventStatus === 'COMPLETED'
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 ring-2 ring-purple-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-sm font-extrabold mb-1">🏆 COMPLETED</div>
              <span>Triggers Final Results on Live Screen</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE QR CODE SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl text-center flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Team Registration QR Code</h3>
              <p className="text-xs text-slate-400 mb-6">
                Display or print this QR code for participants to register their teams on mobile.
              </p>

              <div className="p-4 bg-white rounded-2xl inline-block mb-4 shadow-xl">
                <QRCodeSVG value={registrationUrl} size={180} />
              </div>

              <div className="text-xs font-mono text-cyan-400 bg-slate-900 p-2.5 rounded-xl border border-slate-800 break-all mb-4">
                {registrationUrl}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT REGISTRATION QR CODE</span>
            </button>
          </div>

          {/* PARAMETER CONFIGURATION FORM */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Event Configuration Parameters</h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={settings.eventName}
                  onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Event Subtitle / Tagline</label>
                <input
                  type="text"
                  required
                  value={settings.eventSubtitle}
                  onChange={(e) => setSettings({ ...settings, eventSubtitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Starting Points</label>
                  <input
                    type="number"
                    required
                    value={settings.startingPoints}
                    onChange={(e) => setSettings({ ...settings, startingPoints: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Min Bid Increment</label>
                  <input
                    type="number"
                    required
                    value={settings.minBidIncrement}
                    onChange={(e) => setSettings({ ...settings, minBidIncrement: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Bidding Timer (Sec)</label>
                  <input
                    type="number"
                    required
                    value={settings.biddingTimerDefault}
                    onChange={(e) => setSettings({ ...settings, biddingTimerDefault: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Answer Timer (Sec)</label>
                  <input
                    type="number"
                    required
                    value={settings.answerTimerDefault}
                    onChange={(e) => setSettings({ ...settings, answerTimerDefault: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-yellow-400 font-extrabold mb-1">⚠️ Non-Bidding Penalty Points (PTS)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={settings.nonBiddingPenalty || 0}
                  onChange={(e) => setSettings({ ...settings, nonBiddingPenalty: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-yellow-500/40 rounded-xl p-2.5 text-yellow-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Deducts specified penalty points from active teams that fail to submit a bid during an active auction. (Set to 0 to disable).
                </span>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl font-extrabold text-black bg-cyan-400 hover:bg-cyan-300 transition-all text-xs"
              >
                SAVE PARAMETER SETTINGS
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
