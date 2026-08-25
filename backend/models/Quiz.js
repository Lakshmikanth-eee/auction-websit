const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Please add a question text'],
    trim: true,
  },
  optionA: {
    type: String,
    required: [true, 'Please add option A'],
    trim: true,
  },
  optionB: {
    type: String,
    required: [true, 'Please add option B'],
    trim: true,
  },
  optionC: {
    type: String,
    required: [true, 'Please add option C'],
    trim: true,
  },
  optionD: {
    type: String,
    required: [true, 'Please add option D'],
    trim: true,
  },
  correctAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: [true, 'Please specify the correct answer (A, B, C, or D)'],
  },
  marks: {
    type: Number,
    required: true,
    default: 1,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
});

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a quiz title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Please add quiz duration in minutes'],
      default: 30,
    },
    passingMarks: {
      type: Number,
      required: [true, 'Please add passing marks'],
      default: 10,
    },
    totalMarks: {
      type: Number,
      required: [true, 'Please add total marks'],
      default: 20,
    },
    questions: [questionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Quiz', quizSchema);
