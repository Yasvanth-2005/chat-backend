import express from "express";
import cors from "cors";
import roomRoutes from "./routes/room.routes";
import chatRoutes from "./routes/chat.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/rooms", roomRoutes);
app.use("/api/chats", chatRoutes);

export default app;
