const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const { protect, studentOnly } = require('../middleware/authMiddleware');
const { mockAttempts } = require('../config/mockStore');

// @desc    Get student profile stats and attempt history
// @route   GET /api/users/profile
// @access  Private/Student
router.get('/profile', protect, studentOnly, async (req, res) => {
  try {
    let attempts = [];

    if (mongoose.connection.readyState === 1) {
      attempts = await Attempt.find({ student: req.user._id }).sort({ completedAt: -1 });
    } else {
      attempts = mockAttempts
        .filter((att) => String(att.student) === String(req.user._id))
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    }

    const totalAttempts = attempts.length;
    let totalScore = 0;
    let passedCount = 0;

    attempts.forEach((att) => {
      totalScore += att.percentage;
      if (att.passed) passedCount++;
    });

    const averageScore = totalAttempts > 0 ? Number((totalScore / totalAttempts).toFixed(2)) : 0;
    const passPercentage = totalAttempts > 0 ? Number(((passedCount / totalAttempts) * 100).toFixed(2)) : 0;

    res.json({
      studentInfo: {
        name: req.user.name,
        email: req.user.email,
        department: req.user.department,
        createdAt: req.user.createdAt,
      },
      stats: {
        totalAttempts,
        averageScore,
        passedCount,
        failedCount: totalAttempts - passedCount,
        passPercentage,
      },
      attempts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
