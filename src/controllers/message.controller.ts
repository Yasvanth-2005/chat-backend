import { RequestHandler } from "express";
import Message from "../models/Message";
import Chat from "../models/Chat";
import { io } from "../socket/socketManager";

export const deleteMessage: RequestHandler = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const { chatId, userId } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Add user to deletedFor array if not already present
    if (!message.deletedFor?.includes(userId)) {
      message.deletedFor = message.deletedFor || [];
      message.deletedFor.push(userId);
      await message.save();
    }

    // Get the last message for the chat
    const lastMessage = await Message.findOne({ chatId })
      .sort({ createdAt: -1 })
      .select("body createdAt");

    // Emit socket event
    io.to(chatId).emit("messageDeleted", {
      chatId,
      messageId,
      lastMessage,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Error deleting message" });
  }
};
