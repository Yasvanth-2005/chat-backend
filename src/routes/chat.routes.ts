import { Router } from "express";
import Chat from "../models/Chat";
import Message from "../models/Message";
import User from "../models/User";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "displayName");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/:userId/chats", async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.params.userId,
    })
      .populate("participants", "displayName photoURL")
      .populate("lastMessage");

    res.json({ conversations: chats });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:chatId/messages", async (req, res) => {
  try {
    const messages = await Message.find({
      chatId: req.params.chatId,
      type: "direct",
    }).populate("userId", "displayName");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
