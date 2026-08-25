import { Request, Response } from 'express';
import { prisma } from '../prisma/db';
import { AuthRequest } from '../middleware/auth';

// Helper for difficulty default points
const getBasePointsForDifficulty = (diff: string): number => {
  switch (diff.toUpperCase()) {
    case 'EASY':
      return 100;
    case 'MEDIUM':
      return 300;
    case 'HARD':
      return 500;
    case 'SUPER_CHALLENGE':
    case 'SUPER CHALLENGE':
      return 1000;
    default:
      return 100;
  }
};

// 1. Get Questions with search & filter
export const getQuestions = async (req: Request, res: Response) => {
  try {
    const { search, difficulty, category, isUsed } = req.query;

    const whereClause: any = {};
    if (difficulty && difficulty !== 'ALL') {
      whereClause.difficulty = (difficulty as string).toUpperCase().replace(' ', '_');
    }
    if (category && category !== 'ALL') {
      whereClause.category = category as string;
    }
    if (isUsed !== undefined && isUsed !== 'ALL') {
      whereClause.isUsed = isUsed === 'true';
    }
    if (search) {
      const q = (search as string).trim();
      whereClause.OR = [
        { questionText: { contains: q } },
        { category: { contains: q } },
        { correctAnswer: { contains: q } },
      ];
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, questions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
  }
};

// 2. Add Question
export const addQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { questionText, correctAnswer, difficulty, basePoints, timeLimit, category } = req.body;

    if (!questionText || !correctAnswer || !difficulty || !category) {
      return res.status(400).json({ success: false, message: 'Question text, correct answer, difficulty, and category are required.' });
    }

    const normalizedDiff = difficulty.toUpperCase().replace(' ', '_');
    const calculatedBasePoints = basePoints ? Number(basePoints) : getBasePointsForDifficulty(normalizedDiff);

    const question = await prisma.question.create({
      data: {
        questionText: questionText.trim(),
        correctAnswer: correctAnswer.trim(),
        difficulty: normalizedDiff,
        basePoints: calculatedBasePoints,
        timeLimit: timeLimit ? Number(timeLimit) : 30,
        category: category.trim(),
      },
    });

    return res.status(201).json({ success: true, message: 'Question created successfully.', question });
  } catch (error: any) {
    console.error('Add question error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create question.' });
  }
};

// 3. Edit Question
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { questionText, correctAnswer, difficulty, basePoints, timeLimit, category, isUsed } = req.body;

    const normalizedDiff = difficulty ? difficulty.toUpperCase().replace(' ', '_') : undefined;

    const question = await prisma.question.update({
      where: { id },
      data: {
        questionText: questionText?.trim(),
        correctAnswer: correctAnswer?.trim(),
        difficulty: normalizedDiff,
        basePoints: basePoints ? Number(basePoints) : undefined,
        timeLimit: timeLimit ? Number(timeLimit) : undefined,
        category: category?.trim(),
        isUsed: isUsed !== undefined ? Boolean(isUsed) : undefined,
      },
    });

    return res.json({ success: true, message: 'Question updated successfully.', question });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update question.' });
  }
};

// 4. Duplicate Question
export const duplicateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const original = await prisma.question.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ success: false, message: 'Original question not found.' });

    const duplicated = await prisma.question.create({
      data: {
        questionText: `${original.questionText} (Copy)`,
        correctAnswer: original.correctAnswer,
        difficulty: original.difficulty,
        basePoints: original.basePoints,
        timeLimit: original.timeLimit,
        category: original.category,
        isUsed: false,
      },
    });

    return res.status(201).json({ success: true, message: 'Question duplicated successfully.', question: duplicated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to duplicate question.' });
  }
};

// 5. Delete Single Question
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.question.delete({ where: { id } });
    return res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
};

// 6. Bulk Delete / Delete All Questions
export const bulkDeleteQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { questionIds, deleteAll } = req.body;

    if (deleteAll) {
      const result = await prisma.question.deleteMany({});
      return res.json({ success: true, message: `All ${result.count} questions deleted successfully.` });
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide an array of question IDs or deleteAll flag.' });
    }

    const result = await prisma.question.deleteMany({
      where: { id: { in: questionIds } },
    });

    return res.json({ success: true, message: `${result.count} questions deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete questions.' });
  }
};

// 7. Bulk Upload Questions (JSON array)
export const bulkUploadQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { questions } = req.body; // Array of question objects
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide an array of questions.' });
    }

    const createdCount = await prisma.question.createMany({
      data: questions.map((q: any) => {
        const diff = (q.difficulty || 'EASY').toUpperCase().replace(' ', '_');
        return {
          questionText: q.questionText || q.question || '',
          correctAnswer: q.correctAnswer || q.answer || '',
          difficulty: diff,
          basePoints: Number(q.basePoints || getBasePointsForDifficulty(diff)),
          timeLimit: Number(q.timeLimit || 30),
          category: q.category || 'General EEE',
        };
      }),
    });

    return res.status(201).json({ success: true, message: `${createdCount.count} questions uploaded successfully.` });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to bulk upload questions.' });
  }
};

// 8. Pick Random Question
export const getRandomQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { difficulty, category } = req.query;
    const whereClause: any = { isUsed: false };

    if (difficulty && difficulty !== 'ALL') {
      whereClause.difficulty = (difficulty as string).toUpperCase().replace(' ', '_');
    }
    if (category && category !== 'ALL') {
      whereClause.category = category as string;
    }

    const unusedQuestions = await prisma.question.findMany({ where: whereClause });

    if (unusedQuestions.length === 0) {
      return res.status(404).json({ success: false, message: 'No unused questions found for the given criteria.' });
    }

    const randomIndex = Math.floor(Math.random() * unusedQuestions.length);
    const selected = unusedQuestions[randomIndex];

    return res.json({ success: true, question: selected });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to pick random question.' });
  }
};
