const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Attempt = require('./models/Attempt');

dotenv.config();

const users = [
  {
    name: 'TechQuiz Administrator',
    email: 'admin@techquiz.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'John Doe',
    email: 'student@techquiz.com',
    password: 'student123',
    role: 'student',
    department: 'Computer Science',
  },
];

const sampleQuizzes = (adminId) => [
  {
    title: 'JavaScript Fundamentals',
    description: 'Test your core understanding of JavaScript closures, scopes, arrays, promises, and async execution.',
    category: 'JavaScript',
    duration: 10, // 10 minutes
    passingMarks: 6,
    totalMarks: 10,
    createdBy: adminId,
    isPublished: true,
    questions: [
      {
        questionText: 'Which keyword is used to declare a variable that is block-scoped and cannot be reassigned?',
        optionA: 'var',
        optionB: 'let',
        optionC: 'const',
        optionD: 'def',
        correctAnswer: 'C',
        marks: 2,
        difficulty: 'Easy',
      },
      {
        questionText: 'What is the output of: console.log(typeof NaN);',
        optionA: '"number"',
        optionB: '"nan"',
        optionC: '"undefined"',
        optionD: '"object"',
        correctAnswer: 'A',
        marks: 2,
        difficulty: 'Medium',
      },
      {
        questionText: 'Which of the following is NOT a JavaScript primitive data type?',
        optionA: 'String',
        optionB: 'Boolean',
        optionC: 'Object',
        optionD: 'Symbol',
        correctAnswer: 'C',
        marks: 2,
        difficulty: 'Easy',
      },
      {
        questionText: 'Which method returns a new array with all elements that pass the test implemented by the provided function?',
        optionA: 'map()',
        optionB: 'filter()',
        optionC: 'reduce()',
        optionD: 'forEach()',
        correctAnswer: 'B',
        marks: 2,
        difficulty: 'Medium',
      },
      {
        questionText: 'What is the purpose of the Event Loop in JavaScript?',
        optionA: 'To execute async operations in a separate operating system thread.',
        optionB: 'To monitor the Call Stack and the Callback Queue, pushing deferred executions to the stack.',
        optionC: 'To optimize DOM painting and UI layouts.',
        optionD: 'To compile Javascript code into machine code.',
        correctAnswer: 'B',
        marks: 2,
        difficulty: 'Hard',
      },
    ],
  },
  {
    title: 'Python Essentials',
    description: 'Evaluate your knowledge on list comprehensions, decorators, generator yield states, and standard library modules.',
    category: 'Python',
    duration: 15,
    passingMarks: 4,
    totalMarks: 8,
    createdBy: adminId,
    isPublished: true,
    questions: [
      {
        questionText: 'What does a generator function return in Python?',
        optionA: 'A list of values',
        optionB: 'An iterator object',
        optionC: 'None',
        optionD: 'A tuple key',
        correctAnswer: 'B',
        marks: 2,
        difficulty: 'Medium',
      },
      {
        questionText: 'Which method can be used to add an item to the end of a list in Python?',
        optionA: 'add()',
        optionB: 'append()',
        optionC: 'insert()',
        optionD: 'extend()',
        correctAnswer: 'B',
        marks: 2,
        difficulty: 'Easy',
      },
      {
        questionText: 'How are keyword arguments passed into functions captured inside Python parameter lists?',
        optionA: '*args',
        optionB: '**kwargs',
        optionC: '*kwargs',
        optionD: '&args',
        correctAnswer: 'B',
        marks: 2,
        difficulty: 'Medium',
      },
      {
        questionText: 'What is the output of: print("hello".find("z"))?',
        optionA: 'False',
        optionB: '-1',
        optionC: 'ValueError',
        optionD: '0',
        correctAnswer: 'B',
        marks: 2,
        difficulty: 'Hard',
      },
    ],
  },
];

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/techquiz';
    console.log(`Connecting to database at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing database collections...');
    await User.deleteMany();
    await Quiz.deleteMany();
    await Attempt.deleteMany();

    console.log('Seeding Users...');
    // We iterate and save individually to trigger pre-save hashing
    const createdUsers = [];
    for (let u of users) {
      const user = new User(u);
      const savedUser = await user.save();
      createdUsers.push(savedUser);
    }
    console.log(`Seeded ${createdUsers.length} users successfully.`);

    const adminUser = createdUsers.find((u) => u.role === 'admin');

    console.log('Seeding Sample Quizzes...');
    const quizzes = sampleQuizzes(adminUser._id);
    const createdQuizzes = await Quiz.insertMany(quizzes);
    console.log(`Seeded ${createdQuizzes.length} quizzes successfully.`);

    console.log('Database Seeding Completed Successfully! 🌱');
    process.exit();
  } catch (error) {
    console.error(`Database seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
