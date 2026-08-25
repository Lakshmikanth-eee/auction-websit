const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { mockUsers, mockQuizzes, mockAttempts } = require('../config/mockStore');

// @desc    Get Admin Dashboard aggregate statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    let totalStudents = 0;
    let totalQuizzes = 0;
    let totalQuestions = 0;
    let completedTests = 0;
    let recentAttempts = [];
    let recentRegistrations = [];

    if (mongoose.connection.readyState === 1) {
      totalStudents = await User.countDocuments({ role: 'student' });
      totalQuizzes = await Quiz.countDocuments();
      const quizzes = await Quiz.find();
      quizzes.forEach((q) => { totalQuestions += q.questions.length; });
      completedTests = await Attempt.countDocuments();
      recentAttempts = await Attempt.find().sort({ completedAt: -1 }).limit(5);
      recentRegistrations = await User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5);
    } else {
      const studentsList = mockUsers.filter((u) => u.role === 'student');
      totalStudents = studentsList.length;
      totalQuizzes = mockQuizzes.length;
      mockQuizzes.forEach((q) => { totalQuestions += q.questions.length; });
      completedTests = mockAttempts.length;

      recentAttempts = [...mockAttempts]
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 5);

      recentRegistrations = [...studentsList]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    }

    const recentActivity = [];

    recentAttempts.forEach((att) => {
      recentActivity.push({
        type: 'attempt',
        message: `${att.studentName} completed "${att.quizName}" with score ${att.marks} (${att.percentage}%)`,
        timestamp: att.completedAt,
      });
    });

    recentRegistrations.forEach((reg) => {
      recentActivity.push({
        type: 'registration',
        message: `New student registration: ${reg.name} (${reg.department || 'General'})`,
        timestamp: reg.createdAt,
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      metrics: {
        totalStudents,
        totalQuizzes,
        totalQuestions,
        completedTests,
      },
      recentActivity: recentActivity.slice(0, 8),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all registered students and their summary
// @route   GET /api/admin/students
// @access  Private/Admin
router.get('/students', protect, adminOnly, async (req, res) => {
  try {
    let studentsData = [];

    if (mongoose.connection.readyState === 1) {
      const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });

      studentsData = await Promise.all(
        students.map(async (student) => {
          const attempts = await Attempt.find({ student: student._id });
          const quizzesPassed = attempts.filter((att) => att.passed).length;
          return {
            _id: student._id,
            name: student.name,
            email: student.email,
            department: student.department || 'General',
            createdAt: student.createdAt,
            totalAttempts: attempts.length,
            quizzesPassed,
          };
        })
      );
    } else {
      const students = mockUsers.filter((u) => u.role === 'student');

      studentsData = students.map((student) => {
        const attempts = mockAttempts.filter((att) => String(att.student) === String(student._id));
        const quizzesPassed = attempts.filter((att) => att.passed).length;
        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          department: student.department || 'General',
          createdAt: student.createdAt,
          totalAttempts: attempts.length,
          quizzesPassed,
        };
      });
    }

    res.json(studentsData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get detailed student results, rankings, and question-wise analysis for a specific quiz
// @route   GET /api/admin/quizzes/:id/results
// @access  Private/Admin
router.get('/quizzes/:id/results', protect, adminOnly, async (req, res) => {
  try {
    let quiz;
    let attempts = [];

    if (mongoose.connection.readyState === 1) {
      quiz = await Quiz.findById(req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
      attempts = await Attempt.find({ quiz: req.params.id }).sort({ percentage: -1, timeTaken: 1 });
    } else {
      quiz = mockQuizzes.find((q) => q._id === req.params.id);
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
      attempts = mockAttempts
        .filter((att) => String(att.quiz) === String(req.params.id))
        .sort((a, b) => b.percentage - a.percentage || a.timeTaken - b.timeTaken);
    }

    const rankedAttempts = attempts.map((att, idx) => {
      const attObj = JSON.parse(JSON.stringify(att));
      attObj.rank = idx + 1;
      return attObj;
    });

    const totalAttempts = attempts.length;
    let highestScore = 0;
    let lowestScore = totalAttempts > 0 ? quiz.totalMarks : 0;
    let sumScore = 0;
    let passedCount = 0;

    attempts.forEach((att) => {
      if (att.marks > highestScore) highestScore = att.marks;
      if (att.marks < lowestScore) lowestScore = att.marks;
      sumScore += att.marks;
      if (att.passed) passedCount++;
    });

    const averageScore = totalAttempts > 0 ? Number((sumScore / totalAttempts).toFixed(2)) : 0;
    const passPercentage = totalAttempts > 0 ? Number(((passedCount / totalAttempts) * 100).toFixed(2)) : 0;

    const questionAnalysis = quiz.questions.map((q) => {
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;

      attempts.forEach((att) => {
        const studentAns = att.answers.find((ans) => String(ans.questionId) === String(q._id));
        if (studentAns) {
          if (studentAns.selectedAnswer === '') {
            skippedCount++;
          } else if (String(studentAns.selectedAnswer).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase()) {
            correctCount++;
          } else {
            wrongCount++;
          }
        } else {
          skippedCount++;
        }
      });

      const totalResponses = totalAttempts || 1;
      const accuracyRate = Number(((correctCount / totalResponses) * 100).toFixed(2));

      return {
        _id: q._id,
        questionText: q.questionText,
        difficulty: q.difficulty,
        correctAnswersCount: correctCount,
        wrongAnswersCount: wrongCount,
        skippedCount,
        accuracyRate,
      };
    });

    res.json({
      quizInfo: {
        _id: quiz._id,
        title: quiz.title,
        category: quiz.category,
        totalMarks: quiz.totalMarks,
        passingMarks: quiz.passingMarks,
        questionsCount: quiz.questions.length,
      },
      stats: {
        totalAttempts,
        highestScore,
        lowestScore: totalAttempts > 0 ? lowestScore : 0,
        averageScore,
        passPercentage,
      },
      standings: rankedAttempts,
      questionAnalysis,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
