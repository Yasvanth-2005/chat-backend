import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.use("/api/chats", chatRoutes);

export default app;
