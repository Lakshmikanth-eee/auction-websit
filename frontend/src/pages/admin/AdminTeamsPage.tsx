import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { fetchAPI } from '../../services/api';
import {
  Users,
  Search,
  Filter,
  Trash2,
  Edit,
  Power,
  Plus,
  History,
  AlertTriangle,
  X,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Download,
} from 'lucide-react';

interface Team {
  id: string;
  registrationNumber: string;
  teamName: string;
  participant1Name: string;
  participant2Name: string;
  collegeName: string;
  department: string;
  phone: string;
  email: string;
  points: number;
  status: string;
  correctAnswers: number;
  createdAt: string;
}

export const AdminTeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Modals state
  const [scoreModalTeam, setScoreModalTeam] = useState<Team | null>(null);
  const [scoreAmount, setScoreAmount] = useState<number | string>(10000);
  const [scoreActionType, setScoreActionType] = useState<'SET' | 'ADD' | 'SUBTRACT' | 'RESET'>('SET');
  const [scoreReason, setScoreReason] = useState<string>('Admin point adjustment');

  // Bulk Points Modal state
  const [bulkPointsModal, setBulkPointsModal] = useState<boolean>(false);
  const [bulkPointsValue, setBulkPointsValue] = useState<number | string>(10000);
  const [bulkPointsApplyToAll, setBulkPointsApplyToAll] = useState<boolean>(true);
  const [bulkPointsReason, setBulkPointsReason] = useState<string>('Admin set initial team starting balance');

  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [historyTeam, setHistoryTeam] = useState<any | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ type: 'SINGLE' | 'BULK'; team?: Team } | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);

      const res = await fetchAPI(`/admin/teams?${queryParams.toString()}`);
      if (res.success) {
        setTeams(res.teams);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load teams.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [search, statusFilter]);

  // Select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTeamIds(teams.map((t) => t.id));
    } else {
      setSelectedTeamIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedTeamIds.includes(id)) {
      setSelectedTeamIds(selectedTeamIds.filter((tId) => tId !== id));
    } else {
      setSelectedTeamIds([...selectedTeamIds, id]);
    }
  };

  // Toggle Status (Enable/Disable)
  const handleToggleStatus = async (team: Team) => {
    const newStatus = team.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await fetchAPI(`/admin/teams/${team.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        setMessage({ type: 'success', text: `Team ${team.teamName} is now ${newStatus}.` });
        loadTeams();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Confirm Single Delete
  const handleDeleteSingle = async () => {
    if (!confirmDeleteModal?.team) return;
    try {
      const res = await fetchAPI(`/admin/teams/${confirmDeleteModal.team.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setConfirmDeleteModal(null);
        loadTeams();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Confirm Bulk Delete
  const handleDeleteBulk = async () => {
    if (selectedTeamIds.length === 0) return;
    try {
      const res = await fetchAPI('/admin/teams/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ teamIds: selectedTeamIds }),
      });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setSelectedTeamIds([]);
        setConfirmDeleteModal(null);
        loadTeams();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Manual Score Adjustment
  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreModalTeam) return;
    if (!scoreReason.trim()) {
      setMessage({ type: 'error', text: 'Score adjustment reason is mandatory.' });
      return;
    }

    try {
      const res = await fetchAPI(`/admin/teams/${scoreModalTeam.id}/adjust-score`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(scoreAmount) || 0,
          actionType: scoreActionType,
          reason: scoreReason,
        }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setScoreModalTeam(null);
        setScoreReason('');
        loadTeams();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Edit Team Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam) return;

    try {
      const res = await fetchAPI(`/admin/teams/${editTeam.id}`, {
        method: 'PUT',
        body: JSON.stringify(editTeam),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setEditTeam(null);
        loadTeams();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // View Team History Modal
  const openHistoryModal = async (teamId: string) => {
    try {
      const res = await fetchAPI(`/admin/teams/${teamId}`);
      if (res.success) {
        setHistoryTeam(res.team);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to fetch team history.' });
    }
  };

  // Download Official Winner List CSV
  const handleDownloadWinnerList = () => {
    const sortedTeams = [...teams].sort((a, b) => b.points - a.points);

    const headers = [
      'Rank',
      'Registration Number',
      'Team Name',
      'Participant 1',
      'Participant 2',
      'College Name',
      'Department',
      'Phone',
      'Email',
      'Final Points',
      'Correct Answers Count',
      'Status'
    ];

    const rows = sortedTeams.map((t, idx) => [
      `${idx + 1}`,
      `"${t.registrationNumber || ''}"`,
      `"${t.teamName || ''}"`,
      `"${t.participant1Name || ''}"`,
      `"${t.participant2Name || ''}"`,
      `"${t.collegeName || ''}"`,
      `"${t.department || ''}"`,
      `"${t.phone || ''}"`,
      `"${t.email || ''}"`,
      `${t.points || 0}`,
      `${t.correctAnswers || 0}`,
      `"${t.status || 'ACTIVE'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `electrobit_winner_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Bulk Set Points
  const handleBulkPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchAPI('/admin/teams/bulk-points', {
        method: 'POST',
        body: JSON.stringify({
          teamIds: selectedTeamIds,
          newPoints: Number(bulkPointsValue) || 0,
          applyToAll: bulkPointsApplyToAll,
          reason: bulkPointsReason,
        }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setBulkPointsModal(false);
        loadTeams();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to bulk set team points.' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center space-x-3">
              <Users className="w-8 h-8 text-cyan-400" />
              <span>Team Management</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              View, edit, search, filter, adjust points with reason logs, enable/disable, or delete teams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setBulkPointsApplyToAll(true);
                setBulkPointsModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-lg shadow-green-500/20 transition-all"
            >
              <DollarSign className="w-4 h-4 text-white" />
              <span>⚡ Set Points for All Teams</span>
            </button>

            <button
              onClick={handleDownloadWinnerList}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-extrabold text-xs text-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-500/20 transition-all"
            >
              <Download className="w-4 h-4 text-black" />
              <span>🏆 Download Winner List</span>
            </button>

            {selectedTeamIds.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setBulkPointsApplyToAll(false);
                    setBulkPointsModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-500/20"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Set Selected ({selectedTeamIds.length}) Points</span>
                </button>

                <button
                  onClick={() => setConfirmDeleteModal({ type: 'BULK' })}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected ({selectedTeamIds.length})</span>
                </button>
              </>
            )}
          </div>
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
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-[#0d1424] border border-cyan-500/20 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search team, reg #, participant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Teams</option>
              <option value="DISABLED">Disabled Teams</option>
            </select>
          </div>
        </div>

        {/* TEAMS TABLE */}
        <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-4 px-4 text-center w-12">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={teams.length > 0 && selectedTeamIds.length === teams.length}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                    />
                  </th>
                  <th className="py-4 px-4">Reg #</th>
                  <th className="py-4 px-4">Team Name</th>
                  <th className="py-4 px-4">Participants</th>
                  <th className="py-4 px-4">College</th>
                  <th className="py-4 px-4 text-center">Points</th>
                  <th className="py-4 px-4 text-center">Solved Qs</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading registered teams...
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No teams matching your search.
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id);
                    return (
                      <tr key={team.id} className={`hover:bg-slate-800/50 ${isSelected ? 'bg-cyan-500/10' : ''}`}>
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(team.id)}
                            className="rounded border-slate-700 bg-slate-900 text-cyan-400"
                          />
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-cyan-400 text-xs">
                          {team.registrationNumber}
                        </td>
                        <td className="py-4 px-4 font-bold text-white">
                          <div>{team.teamName}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{team.email}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-300 text-xs">
                          <div>1: {team.participant1Name}</div>
                          <div>2: {team.participant2Name}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-400 text-xs">
                          <div className="truncate max-w-xs">{team.collegeName}</div>
                          <div className="text-[11px] text-slate-500">{team.department}</div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-black text-yellow-400 text-lg">
                          {team.points}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-extrabold inline-flex items-center space-x-1">
                            <span>🎯 {team.correctAnswers || 0}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              team.status === 'ACTIVE'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {team.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-1 whitespace-nowrap">
                          {/* Score Control */}
                          <button
                            onClick={() => {
                              setScoreModalTeam(team);
                              setScoreAmount(100);
                              setScoreActionType('ADD');
                              setScoreReason('');
                            }}
                            className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20"
                            title="Adjust Score"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          {/* Edit Team */}
                          <button
                            onClick={() => setEditTeam(team)}
                            className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
                            title="Edit Team Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Toggle Active/Disabled */}
                          <button
                            onClick={() => handleToggleStatus(team)}
                            className={`p-2 rounded-lg border ${
                              team.status === 'ACTIVE'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                            }`}
                            title={team.status === 'ACTIVE' ? 'Disable Team' : 'Enable Team'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* History */}
                          <button
                            onClick={() => openHistoryModal(team.id)}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white"
                            title="View History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Single Delete */}
                          <button
                            onClick={() => setConfirmDeleteModal({ type: 'SINGLE', team })}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                            title="Delete Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 1: SCORE ADJUSTMENT WITH MANDATORY REASON */}
        {scoreModalTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-yellow-400/40 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                  <span>Adjust Score: {scoreModalTeam.teamName}</span>
                </h3>
                <button onClick={() => setScoreModalTeam(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScoreSubmit} className="space-y-4 mt-4">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex justify-between">
                  <span>Current Score:</span>
                  <strong className="text-yellow-400 font-mono text-sm">{scoreModalTeam.points} PTS</strong>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Action Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreActionType('SET')}
                      className={`py-2 rounded-xl font-bold text-[11px] border ${
                        scoreActionType === 'SET'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      SET EXACT
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreActionType('ADD')}
                      className={`py-2 rounded-xl font-bold text-[11px] border ${
                        scoreActionType === 'ADD'
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      + ADD
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreActionType('SUBTRACT')}
                      className={`py-2 rounded-xl font-bold text-[11px] border ${
                        scoreActionType === 'SUBTRACT'
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      - DEDUCT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScoreActionType('RESET');
                        setScoreAmount(10000);
                      }}
                      className={`py-2 rounded-xl font-bold text-[11px] border ${
                        scoreActionType === 'RESET'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      RESET (10k)
                    </button>
                  </div>
                </div>

                {scoreActionType !== 'RESET' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Point Amount</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Type points amount..."
                      value={scoreAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setScoreAmount(val);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    Reason for Score Change * (Audit Mandatory)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Penalty for rule violation / Bonus points awarded by judge"
                    value={scoreReason}
                    onChange={(e) => setScoreReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setScoreModalTeam(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl text-xs font-extrabold text-black bg-yellow-400 hover:bg-yellow-300"
                  >
                    CONFIRM SCORE CHANGE
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CONFIRM SAFETY DELETE */}
        {confirmDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-red-500/40 rounded-3xl p-6 max-w-md w-full text-center">
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">Are you sure?</h3>
              <p className="text-xs text-slate-300 mt-2 mb-6">
                {confirmDeleteModal.type === 'SINGLE'
                  ? `Are you sure you want to delete team "${confirmDeleteModal.team?.teamName}"? This action cannot be undone.`
                  : `Are you sure you want to bulk delete ${selectedTeamIds.length} selected teams? This action cannot be undone.`}
              </p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setConfirmDeleteModal(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteModal.type === 'SINGLE' ? handleDeleteSingle : handleDeleteBulk}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-500"
                >
                  YES, DELETE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: EDIT TEAM */}
        {editTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Edit Team: {editTeam.teamName}</h3>
                <button onClick={() => setEditTeam(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    value={editTeam.teamName}
                    onChange={(e) => setEditTeam({ ...editTeam, teamName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Participant 1</label>
                    <input
                      type="text"
                      required
                      value={editTeam.participant1Name}
                      onChange={(e) => setEditTeam({ ...editTeam, participant1Name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Participant 2</label>
                    <input
                      type="text"
                      required
                      value={editTeam.participant2Name}
                      onChange={(e) => setEditTeam({ ...editTeam, participant2Name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">College Name</label>
                  <input
                    type="text"
                    required
                    value={editTeam.collegeName}
                    onChange={(e) => setEditTeam({ ...editTeam, collegeName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={editTeam.department}
                      onChange={(e) => setEditTeam({ ...editTeam, department: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={editTeam.email}
                      onChange={(e) => setEditTeam({ ...editTeam, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditTeam(null)}
                    className="px-4 py-2 rounded-xl text-slate-400 bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl font-bold text-black bg-cyan-400 hover:bg-cyan-300"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: TEAM HISTORY */}
        {historyTeam && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">History Log: {historyTeam.teamName}</h3>
                <button onClick={() => setHistoryTeam(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-6 text-xs">
                {/* Score Transactions */}
                <div>
                  <h4 className="font-bold text-cyan-400 uppercase mb-2">Recent Score Transactions</h4>
                  <div className="space-y-2">
                    {historyTeam.scoreTransactions?.length === 0 ? (
                      <p className="text-slate-500">No score history records.</p>
                    ) : (
                      historyTeam.scoreTransactions?.map((tx: any) => (
                        <div key={tx.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between">
                          <div>
                            <span className="font-bold text-white block">{tx.type}: {tx.reason}</span>
                            <span className="text-slate-500">{new Date(tx.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} PTS
                            </span>
                            <span className="block text-slate-400">{tx.previousPoints} &rarr; {tx.newPoints}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: BULK SET POINTS FOR REGISTERED TEAMS */}
        {bulkPointsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">
                    {bulkPointsApplyToAll ? 'Set Points for ALL Registered Teams' : `Set Points for Selected (${selectedTeamIds.length}) Teams`}
                  </h3>
                </div>
                <button onClick={() => setBulkPointsModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBulkPointsSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Target Teams</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="applyTarget"
                        checked={bulkPointsApplyToAll}
                        onChange={() => setBulkPointsApplyToAll(true)}
                        className="text-emerald-400 focus:ring-0"
                      />
                      <span>All Registered Teams ({teams.length})</span>
                    </label>
                    {selectedTeamIds.length > 0 && (
                      <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="applyTarget"
                          checked={!bulkPointsApplyToAll}
                          onChange={() => setBulkPointsApplyToAll(false)}
                          className="text-emerald-400 focus:ring-0"
                        />
                        <span>Only Selected Teams ({selectedTeamIds.length})</span>
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Select Preset Starting Balance</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setBulkPointsValue(10000)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border ${
                        Number(bulkPointsValue) === 10000 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      10,000 PTS (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkPointsValue(50000)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border ${
                        Number(bulkPointsValue) === 50000 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      50,000 PTS
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkPointsValue(100000)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border ${
                        Number(bulkPointsValue) === 100000 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      100,000 PTS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Custom Points Value</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Type custom starting balance (e.g. 10000)..."
                    value={bulkPointsValue}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setBulkPointsValue(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Reason / Note for Audit Log</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Set initial auction starting points"
                    value={bulkPointsReason}
                    onChange={(e) => setBulkPointsReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-white text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setBulkPointsModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 bg-slate-800 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl font-black text-black bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 uppercase shadow-lg shadow-emerald-500/20"
                  >
                    Update Points Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
