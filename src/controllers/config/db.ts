import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.DATABASE_URL as string
    await mongoose.connect(MONGO_URI,);
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the process with failure
  }
};

export { connectDB };
