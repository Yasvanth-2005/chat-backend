import { RequestHandler } from "express";
import Message from "../models/Message";
import Chat from "../models/Chat";
import { io } from "../socket/socketManager";
import mongoose from "mongoose";

export const deleteMessage: RequestHandler = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const { chatId, userId, mode = "forMe" } = req.body;

    const message = await Message.findOne({ _id: messageId, chatId });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (mode === "forEveryone" && message.senderId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this message for everyone" });
    }

    if (mode === "forEveryone") {
      await Message.findByIdAndDelete(messageId);

      const lastMessage = await Message.findOne({
        chatId,
        _id: { $ne: messageId },
      })
        .sort({ createdAt: -1 })
        .select("body createdAt")
        .lean();

      if (lastMessage) {
        await Chat.findByIdAndUpdate(chatId, { lastMessage: lastMessage._id });
      }

      io.emit("messageDeleted", {
        chatId,
        messageId,
        lastMessage,
        mode: "forEveryone",
      });
    } else {
      if (!message.deletedFor) {
        message.deletedFor = [];
      }

      const existingDelete = message.deletedFor.find(
        (d: any) => d.userId.toString() === userId
      );

      if (existingDelete) {
        existingDelete.deletedAt = new Date();
      } else {
        message.deletedFor.push({
          userId: new mongoose.Types.ObjectId(userId),
          deletedAt: new Date(),
        });
      }

      await message.save();

      io.to(userId).emit("messageDeleted", {
        chatId,
        messageId,
        mode: "forMe",
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Error deleting message" });
  }
};
