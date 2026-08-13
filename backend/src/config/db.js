import mongoose from "mongoose";

export const connectDatabase = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required.");
  }

  await mongoose.connect(MONGODB_URI);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
