import { Router } from "express";
import Chat from "../models/Chat";
import Message from "../models/Message";
import ChatUser from "../models/User";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const users = await ChatUser.find({}, "displayName");
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
      .populate("participants")
      .populate("lastMessage");

    console.log(chats);
    res.json({ conversations: chats });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:chatId/messages", async (req: any, res: any) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate(
      "participants"
    );

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const messages = await Message.find({
      chatId: req.params.chatId,
      type: "direct",
    }).populate("userId");

    console.log(messages);
    res.json({
      messages,
      participants: chat.participants,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
