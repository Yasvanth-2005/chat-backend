import { Router } from "express";
import Chat from "../models/Chat";
import Message from "../models/Message";
import ChatUser from "../models/User";
import User from "../models/User";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const users = await ChatUser.find();
    console.log(users);
    res.json({ contacts: users });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/:userId/chats", async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.params.userId })
      .populate("participants")
      .populate({
        path: "lastMessage",
      });

    chats.sort((a: any, b: any) => {
      const dateA = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const dateB = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;

      console.log(dateB - dateA);
      return dateB - dateA;
    });

    res.json({ conversations: chats });
  } catch (error) {
    console.error("Error fetching chats:", error);
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
    }).populate("senderId");

    res.json({
      messages,
      participants: chat.participants,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/chats", async (req: any, res: any) => {
  try {
    const { userId, contact } = req.body;

    if (!userId || !contact?._id) {
      return res.status(400).json({ error: "Invalid user or contact" });
    }

    const user = await User.findById(userId);
    let contactUser = await User.findById(contact._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!contactUser) {
      contactUser = await User.create({ ...contact });
    }

    let chat = await Chat.findOne({
      participants: { $all: [userId, contactUser._id], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [userId, contactUser._id],
        lastMessage: null,
      });
    }

    const populatedChat: any = await Chat.findById(chat._id).populate<{
      participants: any;
    }>("participants", "displayName socketId");

    console.log(populatedChat);

    return res.status(200).json({ chat });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/chats/multiple", async (req: any, res: any) => {
  try {
    const { userId, recipients, message } = req.body;
    console.log(message);

    if (!userId || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "Invalid user or recipients" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const recipientIds = await Promise.all(
      recipients.map(async (recipient: any) => {
        let contactUser = await User.findById(recipient._id);
        if (!contactUser) {
          contactUser = await User.create({ ...recipient });
        }
        return contactUser._id;
      })
    );

    const participants = [userId, ...recipientIds];

    let chat = await Chat.findOne({
      participants: { $all: participants, $size: participants.length },
    });

    if (!chat) {
      chat = await Chat.create({
        participants,
        lastMessage: null,
        isGroup: true,
      });
    }

    if (message) {
      const newMessage = await Message.create({
        chatId: chat._id,
        senderId: userId,
        body: message.body,
        type: message.type,
        attachments: message.attachments,
      });

      console.log(`newMessage : ${newMessage}`);
      await Chat.findByIdAndUpdate(chat._id, { lastMessage: newMessage._id });
    }

    const populatedChat: any = await Chat.findById(chat._id).populate<{
      participants: any;
    }>("participants", "displayName socketId");

    console.log(populatedChat);

    return res.status(200).json({ chat });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
