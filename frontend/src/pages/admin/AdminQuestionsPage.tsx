import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { fetchAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Copy,
  Upload,
  Shuffle,
  X,
  ShieldAlert,
  Download,
} from 'lucide-react';

interface Question {
  id: string;
  questionText: string;
  correctAnswer: string;
  difficulty: string;
  basePoints: number;
  timeLimit: number;
  category: string;
  isUsed: boolean;
  createdAt: string;
}

export const AdminQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [bulkUploadModal, setBulkUploadModal] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [randomModalQuestion, setRandomModalQuestion] = useState<Question | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ type: 'SINGLE' | 'BULK' | 'ALL'; question?: Question } | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    questionText: '',
    correctAnswer: '',
    difficulty: 'EASY',
    basePoints: 100,
    timeLimit: 30,
    category: 'Electrical Machines',
  });

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (difficultyFilter !== 'ALL') queryParams.append('difficulty', difficultyFilter);
      if (categoryFilter !== 'ALL') queryParams.append('category', categoryFilter);

      const res = await fetchAPI(`/admin/questions?${queryParams.toString()}`);
      if (res.success) {
        setQuestions(res.questions);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load questions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [search, difficultyFilter, categoryFilter]);

  // Select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedQuestionIds(questions.map((q) => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((qId) => qId !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  };

  // Set default points based on difficulty
  const handleDifficultyChange = (diff: string) => {
    let pts = 100;
    if (diff === 'MEDIUM') pts = 300;
    if (diff === 'HARD') pts = 500;
    if (diff === 'SUPER_CHALLENGE') pts = 1000;
    setFormData({ ...formData, difficulty: diff, basePoints: pts });
  };

  // Add Question Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchAPI('/admin/questions', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setAddModal(false);
        setFormData({
          questionText: '',
          correctAnswer: '',
          difficulty: 'EASY',
          basePoints: 100,
          timeLimit: 30,
          category: 'Electrical Machines',
        });
        loadQuestions();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Edit Question Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestion) return;

    try {
      const res = await fetchAPI(`/admin/questions/${editQuestion.id}`, {
        method: 'PUT',
        body: JSON.stringify(editQuestion),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setEditQuestion(null);
        loadQuestions();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Duplicate Question
  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetchAPI(`/admin/questions/${id}/duplicate`, {
        method: 'POST',
      });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        loadQuestions();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Confirm Single Delete
  const handleDeleteSingle = async () => {
    if (!confirmDeleteModal?.question) return;
    try {
      const res = await fetchAPI(`/admin/questions/${confirmDeleteModal.question.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setConfirmDeleteModal(null);
        loadQuestions();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Confirm Bulk Delete
  const handleDeleteBulk = async () => {
    if (selectedQuestionIds.length === 0) return;
    try {
      const res = await fetchAPI('/admin/questions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ questionIds: selectedQuestionIds }),
      });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setSelectedQuestionIds([]);
        setConfirmDeleteModal(null);
        loadQuestions();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Confirm Delete All Questions
  const handleDeleteAll = async () => {
    try {
      const res = await fetchAPI('/admin/questions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ deleteAll: true }),
      });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setSelectedQuestionIds([]);
        setConfirmDeleteModal(null);
        loadQuestions();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Download Excel Question Template (.xlsx)
  const handleDownloadExcelTemplate = () => {
    const sampleQuestions = [
      {
        "questionText": "In a DC machine, what is the purpose of compensating windings placed in the pole shoes?",
        "correctAnswer": "Neutralize armature reaction under pole shoes",
        "difficulty": "HARD",
        "basePoints": 500,
        "timeLimit": 30,
        "category": "Electrical Machines"
      },
      {
        "questionText": "What is the SI unit of magnetic flux density?",
        "correctAnswer": "Tesla",
        "difficulty": "EASY",
        "basePoints": 100,
        "timeLimit": 30,
        "category": "Electromagnetics"
      },
      {
        "questionText": "In a 3-phase induction motor, slip at starting is equal to?",
        "correctAnswer": "1",
        "difficulty": "MEDIUM",
        "basePoints": 300,
        "timeLimit": 30,
        "category": "Electrical Machines"
      },
      {
        "questionText": "What device measures high speed electrical transients in power systems?",
        "correctAnswer": "Oscilloscope / Power Quality Analyzer",
        "difficulty": "SUPER_CHALLENGE",
        "basePoints": 1000,
        "timeLimit": 30,
        "category": "Power Electronics"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleQuestions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(workbook, "ELECTROBID_questions_template.xlsx");
  };

  // Download CSV Question Template
  const handleDownloadCSVTemplate = () => {
    const csvContent =
`questionText,correctAnswer,difficulty,basePoints,timeLimit,category
"In a DC machine, what is the purpose of compensating windings placed in the pole shoes?",Option A - Neutralize armature reaction under pole shoes,HARD,500,30,Electrical Machines
"What is the SI unit of magnetic flux density?",Tesla,EASY,100,30,Electromagnetics
"In a 3-phase induction motor, slip at starting is equal to?",1,MEDIUM,300,30,Electrical Machines
"What device measures high speed electrical transients in power systems?",Oscilloscope / Power Quality Analyzer,SUPER_CHALLENGE,1000,30,Power Electronics`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ELECTROBID_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON Question Template
  const handleDownloadJSONTemplate = () => {
    const sampleQuestions = [
      {
        questionText: "In a DC machine, what is the purpose of compensating windings placed in the pole shoes?",
        correctAnswer: "Option A - Neutralize armature reaction under pole shoes",
        difficulty: "HARD",
        basePoints: 500,
        timeLimit: 30,
        category: "Electrical Machines"
      },
      {
        questionText: "What is the SI unit of magnetic flux density?",
        correctAnswer: "Tesla",
        difficulty: "EASY",
        basePoints: 100,
        timeLimit: 30,
        category: "Electromagnetics"
      },
      {
        questionText: "In a 3-phase induction motor, slip at starting is equal to?",
        correctAnswer: "1",
        difficulty: "MEDIUM",
        basePoints: 300,
        timeLimit: 30,
        category: "Electrical Machines"
      }
    ];

    const jsonString = JSON.stringify(sampleQuestions, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ELECTROBID_questions_template.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Selected (Excel .xlsx / .xls / .csv / .json / .txt)
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const lowerName = file.name.toLowerCase();

    // 1. JSON File Parsing
    if (lowerName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          const qList = Array.isArray(parsed) ? parsed : [parsed];
          setParsedQuestions(qList);
          setBulkJsonText(JSON.stringify(qList, null, 2));
          setMessage({ type: 'success', text: `Loaded ${qList.length} questions from JSON file "${file.name}"!` });
        } catch (err) {
          setMessage({ type: 'error', text: 'Invalid JSON file format.' });
        }
      };
      reader.readAsText(file);
      return;
    }

    // 2. Excel (.xlsx, .xls, .xlsm, .xlsb) & CSV / Text Parsing using SheetJS
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setMessage({ type: 'error', text: 'The uploaded file contains no data.' });
          return;
        }

        const qList: any[] = [];
        rawJson.forEach((row) => {
          const obj: any = {};
          Object.keys(row).forEach((colName) => {
            const keyLower = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const val = String(row[colName] || '').trim();

            if (keyLower.includes('question') || keyLower === 'q' || keyLower.includes('text')) {
              obj.questionText = val;
            } else if (keyLower.includes('answer') || keyLower === 'a' || keyLower.includes('correct')) {
              obj.correctAnswer = val;
            } else if (keyLower.includes('diff')) {
              obj.difficulty = val.toUpperCase();
            } else if (keyLower.includes('point') || keyLower.includes('base') || keyLower === 'score') {
              obj.basePoints = Number(val) || 100;
            } else if (keyLower.includes('time') || keyLower.includes('limit')) {
              obj.timeLimit = Number(val) || 30;
            } else if (keyLower.includes('cat') || keyLower.includes('topic')) {
              obj.category = val;
            }
          });

          if (obj.questionText && obj.correctAnswer) {
            if (!obj.difficulty) obj.difficulty = 'EASY';
            if (!obj.basePoints) obj.basePoints = 100;
            if (!obj.timeLimit) obj.timeLimit = 30;
            if (!obj.category) obj.category = 'General EEE';
            qList.push(obj);
          }
        });

        if (qList.length > 0) {
          setParsedQuestions(qList);
          setBulkJsonText(JSON.stringify(qList, null, 2));
          setMessage({ type: 'success', text: `Loaded ${qList.length} questions from Excel file "${file.name}"!` });
        } else {
          setMessage({ type: 'error', text: 'Could not extract questions. Please ensure column headers include Question Text and Correct Answer.' });
        }
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setMessage({ type: 'error', text: 'Error reading file. Please ensure it is a valid .xlsx, .xls, or .csv file.' });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Bulk Upload Submit
  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let payload: any[] = parsedQuestions;

      if (payload.length === 0 && bulkJsonText.trim()) {
        const parsed = JSON.parse(bulkJsonText);
        payload = Array.isArray(parsed) ? parsed : [parsed];
      }

      if (!Array.isArray(payload) || payload.length === 0) {
        setMessage({ type: 'error', text: 'Please select a file or paste question data.' });
        return;
      }

      const res = await fetchAPI('/admin/questions/bulk-upload', {
        method: 'POST',
        body: JSON.stringify({ questions: payload }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setBulkUploadModal(false);
        setBulkJsonText('');
        setParsedQuestions([]);
        setUploadedFileName('');
        loadQuestions();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Upload failed: ${err.message}` });
    }
  };

  // Pick Random Question
  const handlePickRandom = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (difficultyFilter !== 'ALL') queryParams.append('difficulty', difficultyFilter);
      if (categoryFilter !== 'ALL') queryParams.append('category', categoryFilter);

      const res = await fetchAPI(`/admin/questions/random?${queryParams.toString()}`);
      if (res.success && res.question) {
        setRandomModalQuestion(res.question);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No unused questions found.' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center space-x-3">
              <HelpCircle className="w-8 h-8 text-yellow-400" />
              <span>Question Management</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Add, edit, duplicate, filter, bulk upload, pick random questions, or delete single/bulk items.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePickRandom}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20"
            >
              <Shuffle className="w-4 h-4" />
              <span>Random Question</span>
            </button>

            <button
              onClick={() => setBulkUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Bulk Upload</span>
            </button>

            <button
              onClick={() => setAddModal(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-extrabold text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>ADD QUESTION</span>
            </button>

            {selectedQuestionIds.length > 0 && (
              <button
                onClick={() => setConfirmDeleteModal({ type: 'BULK' })}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedQuestionIds.length})</span>
              </button>
            )}

            {questions.length > 0 && (
              <button
                onClick={() => setConfirmDeleteModal({ type: 'ALL' })}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-red-300 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All Questions</span>
              </button>
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

        {/* Search & Filters */}
        <div className="bg-[#0d1424] border border-cyan-500/20 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search question text or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">EASY (100 PTS)</option>
              <option value="MEDIUM">MEDIUM (300 PTS)</option>
              <option value="HARD">HARD (500 PTS)</option>
              <option value="SUPER_CHALLENGE">SUPER CHALLENGE (1000 PTS)</option>
            </select>
          </div>
        </div>

        {/* QUESTIONS TABLE */}
        <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-4 px-4 text-center w-12">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={questions.length > 0 && selectedQuestionIds.length === questions.length}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-400"
                    />
                  </th>
                  <th className="py-4 px-4">Difficulty</th>
                  <th className="py-4 px-4">Question Text</th>
                  <th className="py-4 px-4">Correct Answer</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading question bank...
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No questions found in database.
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <tr key={q.id} className={`hover:bg-slate-800/50 ${isSelected ? 'bg-cyan-500/10' : ''}`}>
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(q.id)}
                            className="rounded border-slate-700 bg-slate-900 text-cyan-400"
                          />
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              q.difficulty === 'EASY'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                : q.difficulty === 'MEDIUM'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                : q.difficulty === 'HARD'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-400'
                            }`}
                          >
                            {q.difficulty} ({q.basePoints} PTS)
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-white max-w-xs sm:max-w-md truncate">
                          {q.questionText}
                        </td>

                        <td className="py-4 px-4 text-xs font-mono text-cyan-300 max-w-xs truncate">
                          {q.correctAnswer}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-400">{q.category}</td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              q.isUsed ? 'bg-slate-800 text-slate-500' : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {q.isUsed ? 'USED' : 'UNUSED'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right space-x-1 whitespace-nowrap">
                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(q.id)}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                            title="Duplicate Question"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setEditQuestion(q)}
                            className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
                            title="Edit Question"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setConfirmDeleteModal({ type: 'SINGLE', question: q })}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                            title="Delete Question"
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

        {/* MODAL 1: ADD QUESTION */}
        {addModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Add New Question</h3>
                <button onClick={() => setAddModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Question Text *</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    placeholder="Enter technical question text..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Correct Answer *</label>
                  <input
                    type="text"
                    required
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    placeholder="Reference answer for host evaluation"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Difficulty Level *</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => handleDifficultyChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    >
                      <option value="EASY">EASY (100 PTS)</option>
                      <option value="MEDIUM">MEDIUM (300 PTS)</option>
                      <option value="HARD">HARD (500 PTS)</option>
                      <option value="SUPER_CHALLENGE">SUPER CHALLENGE (1000 PTS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Base Points</label>
                    <input
                      type="number"
                      required
                      value={formData.basePoints}
                      onChange={(e) => setFormData({ ...formData, basePoints: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Circuit Theory / Power Electronics"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setAddModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl font-extrabold text-black bg-cyan-400 hover:bg-cyan-300"
                  >
                    Create Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT QUESTION */}
        {editQuestion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Edit Question</h3>
                <button onClick={() => setEditQuestion(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Question Text</label>
                  <textarea
                    required
                    rows={3}
                    value={editQuestion.questionText}
                    onChange={(e) => setEditQuestion({ ...editQuestion, questionText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Correct Answer</label>
                  <input
                    type="text"
                    required
                    value={editQuestion.correctAnswer}
                    onChange={(e) => setEditQuestion({ ...editQuestion, correctAnswer: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Difficulty</label>
                    <select
                      value={editQuestion.difficulty}
                      onChange={(e) => setEditQuestion({ ...editQuestion, difficulty: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    >
                      <option value="EASY">EASY</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HARD">HARD</option>
                      <option value="SUPER_CHALLENGE">SUPER CHALLENGE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Base Points</label>
                    <input
                      type="number"
                      required
                      value={editQuestion.basePoints}
                      onChange={(e) => setEditQuestion({ ...editQuestion, basePoints: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={editQuestion.category}
                    onChange={(e) => setEditQuestion({ ...editQuestion, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditQuestion(null)}
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

        {/* MODAL 3: BULK UPLOAD FILE & DOWNLOAD TEMPLATES */}
        {bulkUploadModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Bulk Upload Questions (File & Templates)</h3>
                </div>
                <button
                  onClick={() => {
                    setBulkUploadModal(false);
                    setParsedQuestions([]);
                    setUploadedFileName('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. DOWNLOAD TEMPLATES SECTION */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  📥 Step 1: Download Sample Template
                </span>
                <p className="text-xs text-slate-400">
                  Download a sample template pre-formatted with all question columns (Question, Answer, Difficulty, Base Points, Category):
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 flex items-center space-x-2 transition-all shadow-md"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Download Excel Template (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSVTemplate}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 flex items-center space-x-2 transition-all shadow-md"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Download CSV Template (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJSONTemplate}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-500/10 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 flex items-center space-x-2 transition-all shadow-md"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>Download JSON Template (.json)</span>
                  </button>
                </div>
              </div>

              {/* 2. FILE UPLOAD PICKER SECTION */}
              <form onSubmit={handleBulkUploadSubmit} className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    📁 Step 2: Upload Excel, CSV or JSON File
                  </span>

                  <label className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/60 transition-all">
                    <Upload className="w-8 h-8 text-cyan-400 mb-2 animate-bounce" />
                    <span className="text-sm font-bold text-white">Click to Select Excel / CSV / JSON File</span>
                    <span className="text-[11px] text-slate-400 mt-1">Supports .xlsx, .xls, .csv, or .json files</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.json,.txt"
                      onChange={handleFileSelected}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* FILE PARSED STATUS & PREVIEW */}
                {uploadedFileName && (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">📄 {uploadedFileName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black font-mono font-bold text-[10px]">
                        {parsedQuestions.length} Questions Loaded
                      </span>
                    </div>
                  </div>
                )}

                {/* MANUAL TEXT AREA FALLBACK */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Or Paste Data / Edit Raw JSON Below:
                  </label>
                  <textarea
                    rows={5}
                    placeholder={`[\n  {\n    "questionText": "What is the SI unit of flux?",\n    "correctAnswer": "Weber",\n    "difficulty": "EASY",\n    "category": "Electromagnetics"\n  }\n]`}
                    value={bulkJsonText}
                    onChange={(e) => {
                      setBulkJsonText(e.target.value);
                      try {
                        const parsed = JSON.parse(e.target.value);
                        if (Array.isArray(parsed)) setParsedQuestions(parsed);
                      } catch (err) {}
                    }}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 font-mono text-xs text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkUploadModal(false);
                      setParsedQuestions([]);
                      setUploadedFileName('');
                    }}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-400 bg-slate-800 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={parsedQuestions.length === 0 && !bulkJsonText.trim()}
                    className="px-6 py-2.5 rounded-xl font-black text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 uppercase shadow-lg shadow-cyan-500/20 disabled:opacity-40"
                  >
                    🚀 Import {parsedQuestions.length > 0 ? `${parsedQuestions.length} Questions` : 'Questions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: RANDOM PICKER MODAL */}
        {randomModalQuestion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-purple-500/50 rounded-3xl p-6 max-w-lg w-full text-center shadow-2xl">
              <Shuffle className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest block mb-1">RANDOM QUESTION PICKED</span>
              <h3 className="text-xl font-extrabold text-white mb-4">"{randomModalQuestion.questionText}"</h3>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs mb-6">
                <div>Answer: <strong className="text-cyan-400 font-mono">{randomModalQuestion.correctAnswer}</strong></div>
                <div>Difficulty: <strong className="text-yellow-400">{randomModalQuestion.difficulty} ({randomModalQuestion.basePoints} PTS)</strong></div>
                <div>Category: <span className="text-slate-300">{randomModalQuestion.category}</span></div>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setRandomModalQuestion(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: CONFIRM SAFETY DELETE */}
        {confirmDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-red-500/40 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl">
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">
                {confirmDeleteModal.type === 'ALL'
                  ? 'Delete All Questions?'
                  : confirmDeleteModal.type === 'SINGLE'
                  ? 'Delete Single Question?'
                  : 'Delete Selected Questions?'}
              </h3>
              <p className="text-xs text-slate-300 mt-2 mb-6">
                {confirmDeleteModal.type === 'SINGLE'
                  ? `Are you sure you want to delete "${confirmDeleteModal.question?.questionText.slice(0, 50)}..."? This action cannot be undone.`
                  : confirmDeleteModal.type === 'ALL'
                  ? `Are you sure you want to PERMANENTLY DELETE ALL ${questions.length} QUESTIONS in the database? This action cannot be undone!`
                  : `Are you sure you want to delete ${selectedQuestionIds.length} selected questions? This action cannot be undone.`}
              </p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setConfirmDeleteModal(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    confirmDeleteModal.type === 'SINGLE'
                      ? handleDeleteSingle
                      : confirmDeleteModal.type === 'ALL'
                      ? handleDeleteAll
                      : handleDeleteBulk
                  }
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20"
                >
                  {confirmDeleteModal.type === 'ALL' ? 'YES, DELETE ALL' : 'YES, DELETE'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
