const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const { protect, adminOnly, studentOnly } = require('../middleware/authMiddleware');
const { mockQuizzes, mockAttempts } = require('../config/mockStore');

// Set up memory storage for Multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed!'), false);
    }
  },
});

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (req.user.role === 'student') {
        query.isPublished = true;
      }
      const quizzes = await Quiz.find(query).select('-questions.correctAnswer').sort({ createdAt: -1 });
      return res.json(quizzes);
    } else {
      // In-Memory Fallback
      let list = mockQuizzes;
      if (req.user.role === 'student') {
        list = mockQuizzes.filter((q) => q.isPublished);
      }
      const sanitized = list.map((q) => {
        const copy = JSON.parse(JSON.stringify(q));
        if (req.user.role === 'student') {
          copy.questions = copy.questions.map(({ correctAnswer, ...rest }) => rest);
        }
        return copy;
      });
      return res.json(sanitized);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get a single quiz
// @route   GET /api/quizzes/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    let quizObj;

    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
      quizObj = quiz.toObject();
    } else {
      const found = mockQuizzes.find((q) => q._id === req.params.id);
      if (!found) return res.status(404).json({ message: 'Quiz not found' });
      quizObj = JSON.parse(JSON.stringify(found));
    }

    // Security Reinforcement: Students must NEVER receive correct answers
    if (req.user.role === 'student') {
      if (!quizObj.isPublished) {
        return res.status(403).json({ message: 'Forbidden: Quiz not published' });
      }
      quizObj.questions = quizObj.questions.map((q) => {
        const { correctAnswer, ...studentQuestion } = q;
        return studentQuestion;
      });
    }

    res.json(quizObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new quiz (Admin only)
// @route   POST /api/quizzes
// @access  Private/Admin
router.post('/', protect, adminOnly, async (req, res) => {
  const { title, description, category, duration, passingMarks, totalMarks } = req.body;

  try {
    if (!title || !category || !duration || !passingMarks || !totalMarks) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (mongoose.connection.readyState === 1) {
      const quiz = new Quiz({
        title,
        description,
        category,
        duration: Number(duration),
        passingMarks: Number(passingMarks),
        totalMarks: Number(totalMarks),
        createdBy: req.user._id,
        questions: [],
      });
      const createdQuiz = await quiz.save();
      return res.status(201).json(createdQuiz);
    } else {
      const newQuiz = {
        _id: 'mock_quiz_' + Date.now(),
        title,
        description: description || '',
        category,
        duration: Number(duration),
        passingMarks: Number(passingMarks),
        totalMarks: Number(totalMarks),
        createdBy: req.user._id,
        isPublished: false,
        questions: [],
        createdAt: new Date(),
      };
      mockQuizzes.push(newQuiz);
      return res.status(201).json(newQuiz);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update quiz details (Admin only)
// @route   PUT /api/quizzes/:id
// @access  Private/Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  const { title, description, category, duration, passingMarks, totalMarks, isPublished } = req.body;

  try {
    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      quiz.title = title || quiz.title;
      quiz.description = description !== undefined ? description : quiz.description;
      quiz.category = category || quiz.category;
      quiz.duration = duration !== undefined ? Number(duration) : quiz.duration;
      quiz.passingMarks = passingMarks !== undefined ? Number(passingMarks) : quiz.passingMarks;
      quiz.totalMarks = totalMarks !== undefined ? Number(totalMarks) : quiz.totalMarks;
      quiz.isPublished = isPublished !== undefined ? isPublished : quiz.isPublished;

      const updatedQuiz = await quiz.save();
      return res.json(updatedQuiz);
    } else {
      const quiz = mockQuizzes.find((q) => q._id === req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      if (title) quiz.title = title;
      if (description !== undefined) quiz.description = description;
      if (category) quiz.category = category;
      if (duration !== undefined) quiz.duration = Number(duration);
      if (passingMarks !== undefined) quiz.passingMarks = Number(passingMarks);
      if (totalMarks !== undefined) quiz.totalMarks = Number(totalMarks);
      if (isPublished !== undefined) quiz.isPublished = isPublished;

      return res.json(quiz);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a quiz (Admin only)
// @route   DELETE /api/quizzes/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      await Quiz.findByIdAndDelete(req.params.id);
      await Attempt.deleteMany({ quiz: req.params.id });
    } else {
      const idx = mockQuizzes.findIndex((q) => q._id === req.params.id);
      if (idx !== -1) mockQuizzes.splice(idx, 1);
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// Question Management REST APIs (Admin Only)
// ==========================================

// @desc    Add a question to a quiz
// @route   POST /api/quizzes/:id/questions
// @access  Private/Admin
router.post('/:id/questions', protect, adminOnly, async (req, res) => {
  const { questionText, optionA, optionB, optionC, optionD, correctAnswer, marks, difficulty } = req.body;

  try {
    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return res.status(400).json({ message: 'Please provide all question fields' });
    }

    const newQuestion = {
      _id: 'q_' + Date.now(),
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      marks: Number(marks) || 1,
      difficulty: difficulty || 'Medium',
    };

    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      quiz.questions.push(newQuestion);
      const calculatedTotal = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
      quiz.totalMarks = calculatedTotal || quiz.totalMarks;

      await quiz.save();
      return res.status(201).json(quiz);
    } else {
      const quiz = mockQuizzes.find((q) => q._id === req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      quiz.questions.push(newQuestion);
      const calculatedTotal = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
      quiz.totalMarks = calculatedTotal || quiz.totalMarks;

      return res.status(201).json(quiz);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Edit a question in a quiz
// @route   PUT /api/quizzes/:id/questions/:questionId
// @access  Private/Admin
router.put('/:id/questions/:questionId', protect, adminOnly, async (req, res) => {
  const { questionText, optionA, optionB, optionC, optionD, correctAnswer, marks, difficulty } = req.body;

  try {
    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      const question = quiz.questions.id(req.params.questionId);
      if (!question) return res.status(404).json({ message: 'Question not found' });

      question.questionText = questionText || question.questionText;
      question.optionA = optionA || question.optionA;
      question.optionB = optionB || question.optionB;
      question.optionC = optionC || question.optionC;
      question.optionD = optionD || question.optionD;
      question.correctAnswer = correctAnswer || question.correctAnswer;
      question.marks = marks !== undefined ? Number(marks) : question.marks;
      question.difficulty = difficulty || question.difficulty;

      quiz.totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
      await quiz.save();
      return res.json(quiz);
    } else {
      const quiz = mockQuizzes.find((q) => q._id === req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      const question = quiz.questions.find((q) => q._id === req.params.questionId);
      if (!question) return res.status(404).json({ message: 'Question not found' });

      if (questionText) question.questionText = questionText;
      if (optionA) question.optionA = optionA;
      if (optionB) question.optionB = optionB;
      if (optionC) question.optionC = optionC;
      if (optionD) question.optionD = optionD;
      if (correctAnswer) question.correctAnswer = correctAnswer;
      if (marks !== undefined) question.marks = Number(marks);
      if (difficulty) question.difficulty = difficulty;

      quiz.totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
      return res.json(quiz);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a question from a quiz
// @route   DELETE /api/quizzes/:id/questions/:questionId
// @access  Private/Admin
router.delete('/:id/questions/:questionId', protect, adminOnly, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      quiz.questions.pull({ _id: req.params.questionId });
      quiz.totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

      await quiz.save();
      return res.json({ message: 'Question deleted successfully', quiz });
    } else {
      const quiz = mockQuizzes.find((q) => q._id === req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      const qIdx = quiz.questions.findIndex((q) => q._id === req.params.questionId);
      if (qIdx !== -1) quiz.questions.splice(qIdx, 1);
      quiz.totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

      return res.json({ message: 'Question deleted successfully', quiz });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Upload questions via Excel or CSV file
// @route   POST /api/quizzes/:id/questions/import
// @access  Private/Admin
router.post('/:id/questions/import', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please upload an Excel or CSV file' });

    let quiz;
    if (mongoose.connection.readyState === 1) {
      quiz = await Quiz.findById(req.params.id);
    } else {
      quiz = mockQuizzes.find((q) => q._id === req.params.id);
    }

    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) return res.status(400).json({ message: 'File contains no rows.' });

    const importedQuestions = [];

    rows.forEach((row, index) => {
      const getVal = (possibleKeys) => {
        const foundKey = Object.keys(row).find((k) =>
          possibleKeys.some((pk) => k.trim().toLowerCase() === pk.toLowerCase())
        );
        return foundKey ? String(row[foundKey]).trim() : '';
      };

      const qText = getVal(['question', 'questiontext', 'question text']);
      const optA = getVal(['optiona', 'option a', 'opt a']);
      const optB = getVal(['optionb', 'option b', 'opt b']);
      const optC = getVal(['optionc', 'option c', 'opt c']);
      const optD = getVal(['optiond', 'option d', 'opt d']);
      let corrAnswer = getVal(['correctanswer', 'correct answer', 'answer', 'key']);
      const qMarks = getVal(['marks', 'mark']);
      const qDiff = getVal(['difficulty', 'level']);

      if (qText && optA && optB && optC && optD && corrAnswer) {
        corrAnswer = corrAnswer.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(corrAnswer)) {
          importedQuestions.push({
            _id: 'q_imp_' + Date.now() + '_' + index,
            questionText: qText,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctAnswer: corrAnswer,
            marks: Number(qMarks) || 1,
            difficulty: qDiff || 'Medium',
          });
        }
      }
    });

    quiz.questions.push(...importedQuestions);
    quiz.totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

    if (mongoose.connection.readyState === 1) {
      await quiz.save();
    }

    res.status(200).json({
      message: `Successfully imported ${importedQuestions.length} questions!`,
      quiz,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing file: ' + error.message });
  }
});

// ==========================================
// Student Submission & Automatic Evaluation
// ==========================================

// @desc    Submit quiz answers and evaluate
// @route   POST /api/quizzes/:id/submit
// @access  Private/Student
router.post('/:id/submit', protect, studentOnly, async (req, res) => {
  const { answers, timeTaken } = req.body;

  try {
    if (!answers || timeTaken === undefined) {
      return res.status(400).json({ message: 'Missing submission answers or timeTaken' });
    }

    let quiz;
    if (mongoose.connection.readyState === 1) {
      quiz = await Quiz.findById(req.params.id);
    } else {
      quiz = mockQuizzes.find((q) => q._id === req.params.id);
    }

    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    let correctAnswersCount = 0;
    let wrongAnswersCount = 0;
    let earnedMarks = 0;

    quiz.questions.forEach((q) => {
      const studentSub = answers.find((ans) => String(ans.questionId) === String(q._id));

      if (studentSub && studentSub.selectedAnswer) {
        const studentAns = String(studentSub.selectedAnswer).trim().toUpperCase();
        const correctAns = String(q.correctAnswer).trim().toUpperCase();

        if (studentAns === correctAns) {
          correctAnswersCount++;
          earnedMarks += q.marks;
        } else {
          wrongAnswersCount++;
        }
      } else {
        wrongAnswersCount++;
      }
    });

    const totalQuestions = quiz.questions.length;
    const percentage = quiz.totalMarks > 0 ? (earnedMarks / quiz.totalMarks) * 100 : 0;
    const passed = earnedMarks >= quiz.passingMarks;

    const attemptData = {
      _id: 'att_' + Date.now(),
      student: req.user._id,
      quiz: quiz._id,
      studentName: req.user.name,
      quizName: quiz.title,
      department: req.user.department || 'General',
      answers,
      marks: earnedMarks,
      percentage: Number(percentage.toFixed(2)),
      correctAnswers: correctAnswersCount,
      wrongAnswers: totalQuestions - correctAnswersCount,
      timeTaken: Number(timeTaken),
      passed,
      completedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const attempt = new Attempt(attemptData);
      await attempt.save();
    } else {
      mockAttempts.push(attemptData);
    }

    // Secure Return Screen: Show ONLY success info, score, percentage. Never correct/wrong lists, answer keys, or explanations.
    res.status(201).json({
      message: 'Your quiz has been submitted successfully.',
      score: earnedMarks,
      totalMarks: quiz.totalMarks,
      percentage: Number(percentage.toFixed(2)),
      passed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
