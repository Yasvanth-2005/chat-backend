import { RequestHandler } from "express";
import Message from "../models/Message";
import Chat from "../models/Chat";
import { io } from "../socket/socketManager";
import mongoose from "mongoose";
import User from "../models/User";

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

      const chat: any = await Chat.findById(chatId).populate("participants");

      for (const participant of chat.participants) {
        const participantId = participant._id.toString();

        const lastVisibleMessage = await Message.findOne({
          chatId,
          _id: { $ne: messageId },
          $or: [
            { deletedFor: { $exists: false } },
            { deletedFor: { $size: 0 } },
            {
              deletedFor: {
                $not: {
                  $elemMatch: {
                    userId: new mongoose.Types.ObjectId(participantId),
                  },
                },
              },
            },
          ],
        })
          .sort({ createdAt: -1 })
          .select("body createdAt")
          .lean();

        const participantUser: any = await User.findById(participantId);

        io.to(participantUser.socketId).emit("messageDeleted", {
          chatId,
          messageId,
          lastMessage: lastVisibleMessage,
          mode: "forEveryone",
        });
      }
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

      // Find the last visible message for this user
      const lastVisibleMessage = await Message.findOne({
        chatId,
        $or: [
          { deletedFor: { $exists: false } },
          { deletedFor: { $size: 0 } },
          {
            deletedFor: {
              $not: {
                $elemMatch: { userId: new mongoose.Types.ObjectId(userId) },
              },
            },
          },
        ],
      })
        .sort({ createdAt: -1 })
        .select("body createdAt")
        .lean();

      // Update chat's lastMessage if this is the sender
      if (message.senderId.toString() === userId && lastVisibleMessage) {
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: lastVisibleMessage._id,
        });
      }

      const user: any = await User.findById(userId);
      if (!user) {
        return res.status(200).json({ message: "No User Found" });
      }

      io.to(user.socketId).emit("messageDeleted", {
        chatId,
        messageId,
        lastMessage: lastVisibleMessage,
        mode: "forMe",
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Error deleting message" });
  }
};
