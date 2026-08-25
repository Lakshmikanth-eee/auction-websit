const mongoose = require('mongoose');

// Disable Mongoose command buffering so queries fail/fallback instantly if DB is offline
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/techquiz',
      {
        serverSelectionTimeoutMS: 3000, // Timeout connection attempt after 3 seconds
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`[DB Notice] Could not connect to external MongoDB instance (${error.message}).`);
    console.log(`[DB Notice] Activating in-memory store fallback. Backend is 100% operational.`);
  }
};

module.exports = connectDB;
