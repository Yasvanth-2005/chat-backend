import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import app from "./app";
import { setupSocket } from "./socket/socketManager";
import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config()

app.use(cors());

const connectDb =async () => {
  try {
    const MONGO_URI = process.env.DATABASE_URL as string;
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the process with failure
  }
};


connectDb()

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
