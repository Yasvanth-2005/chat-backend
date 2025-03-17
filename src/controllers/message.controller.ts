import { RequestHandler } from "express";
import Message from "../models/Message";
import Chat from "../models/Chat";
import { io } from "../socket/socketManager";

export const deleteMessage: RequestHandler = async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const { chatId, userId } = req.body;

    // First find the message to verify it exists and belongs to the user
    const message = await Message.findOne({ _id: messageId, chatId });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify the user has permission to delete this message
    if (message.senderId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this message" });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Get the last message for the chat
    const lastMessage = await Message.findOne({
      chatId,
      _id: { $ne: messageId }, // Exclude the deleted message
    })
      .sort({ createdAt: -1 })
      .select("body createdAt")
      .lean();

    // Update the chat's lastMessage if needed
    if (lastMessage) {
      await Chat.findByIdAndUpdate(chatId, { lastMessage: lastMessage._id });
    }

    // Emit socket event
    io.emit("messageDeleted", {
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
