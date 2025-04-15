import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import ChatUser, { IUser } from "../models/User";
import Message from "../models/Message";
import Chat, { IChat } from "../models/Chat";
import type { ServerToClientEvents, ClientToServerEvents } from "../types";

interface PopulatedUser extends Omit<IUser, "socketId"> {
  socketId: string;
  _id: Types.ObjectId;
}

type SocketEvents = {
  addReaction: (data: {
    messageId: string;
    chatId: string;
    emoji: string;
  }) => void;
} & ClientToServerEvents;

type ServerEvents = {
  messageReaction: (data: {
    messageId: string;
    chatId: string;
    reaction: { userId: string; emoji: string } | null;
    userId: string;
  }) => void;
} & ServerToClientEvents;

let io: Server<SocketEvents, ServerEvents>;

export const setupSocket = (socketIo: Server<SocketEvents, ServerEvents>) => {
  io = socketIo;

  io.on("connection", async (socket: Socket<SocketEvents, ServerEvents>) => {
    console.log("User connected:", socket.id);

    socket.on("join", async (userData: any) => {
      try {
        let user: any = await ChatUser.findOne({
          displayName: userData.displayName,
        });

        if (user) {
          user.socketId = socket.id;
          user.displayName = userData.displayName;
          user.photoURL = userData.photoURL;
          user.phoneNumber = userData.phoneNumber;
          user.active = true;
          await user.save();

          console.log("user emmited connected", user._id);
          io.emit("participantStatusUpdate", {
            participantId: user._id,
            status: user.status,
            active: true,
          });
        } else {
          user = await ChatUser.create({ ...userData, socketId: socket.id });
        }
      } catch (error) {
        console.error("Join error:", error);
      }
    });

    socket.on(
      "startChat",
      async ({ userId, contact }: { userId: string; contact?: any }) => {
        try {
          const currentUser = await ChatUser.findOne({ socketId: socket.id });
          let otherUser = await ChatUser.findById(userId);

          if (!currentUser) {
            console.error("Current user not found for socket:", socket.id);
            return;
          }

          if (!otherUser) {
            otherUser = await ChatUser.create({
              socketId: "none",
              ...contact,
            });
          }

          // Check if a chat between these two users already exists
          let chat = await Chat.findOne({
            participants: { $all: [currentUser._id, otherUser._id] },
          });

          if (!chat) {
            chat = await Chat.create({
              participants: [currentUser._id, otherUser._id],
            });
          }

          const populatedChat: any = await Chat.findById(chat._id).populate<{
            participants: any;
          }>("participants", "displayName socketId active status");

          console.log(populatedChat);
          return populatedChat;
        } catch (error) {
          console.error("Start chat error:", error);
        }
      }
    );

    socket.on(
      "getMessageHistory",
      async ({ chatId, page = 1 }: { chatId: string; page: number }) => {
        try {
          const limit = 10 * page;
          const skip = (page - 1) * limit;

          const totalMessages = await Message.countDocuments({ chatId });

          const messages = await Message.find({ chatId })
            .populate("senderId", "displayName status active")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

          socket.emit("messageHistory", {
            messages: messages.reverse(),
            hasMore: totalMessages > skip + limit,
            total: totalMessages,
            currentPage: page,
          });
        } catch (error) {
          console.error("Get message history error:", error);
        }
      }
    );

    socket.on(
      "directMessage",
      async ({ chatId, content }: { chatId: string; content: any }) => {
        try {
          const user = await ChatUser.findOne({ socketId: socket.id });
          const chat: any = await Chat.findById(chatId).populate<{
            participants: PopulatedUser[];
          }>("participants", "socketId displayName active status");

          if (user && chat) {
            const message = await Message.create({
              body: content.body,
              senderId: user._id,
              chatId: new Types.ObjectId(chatId),
              type: content.type,
              attachments: content.attachments,
              replyTo: content.replyTo
                ? new Types.ObjectId(content.replyTo)
                : undefined,
            });

            chat.lastMessage = message._id;
            await chat.save();

            const populatedMessage: any = await Message.findById(message._id)
              .populate<{ senderId: PopulatedUser }>(
                "senderId",
                "displayName active status"
              )
              .populate("replyTo");

            if (populatedMessage) {
              chat.participants.forEach((participant: any) => {
                console.log(`Sending message to: ${participant.socketId}`);
                // Send the new message
                io.to(participant.socketId).emit("messageSent", {
                  message: populatedMessage,
                  chatId: chatId,
                });
              });
            }
          }
        } catch (error) {
          console.error("Direct message error:", error);
        }
      }
    );

    socket.on(
      "message",
      async ({ content, roomId }: { content: string; roomId: string }) => {
        try {
          const user = await ChatUser.findOne({ socketId: socket.id });
          if (user) {
            const message = await Message.create({
              content,
              userId: user._id,
              roomId: new Types.ObjectId(roomId),
              type: "room",
            });

            const populatedMessage: any = await Message.findById(
              message._id
            ).populate<{ userId: PopulatedUser }>(
              "userId",
              "displayName status active"
            );

            if (populatedMessage) {
              io.to(roomId).emit("message", populatedMessage.toJSON());
            }
          }
        } catch (error) {
          console.error("Message error:", error);
        }
      }
    );

    socket.on(
      "addReaction",
      async ({
        messageId,
        chatId,
        emoji,
      }: {
        messageId: string;
        chatId: string;
        emoji: string;
      }) => {
        try {
          const user = await ChatUser.findOne({ socketId: socket.id }).lean();
          if (!user || !user._id) {
            console.error("User not found");
            return;
          }

          const message = await Message.findById(messageId);
          if (!message) {
            console.error("Message not found");
            return;
          }

          // Remove existing reaction from this user if any
          message.reactions = message.reactions.filter(
            (r) => r.userId.toString() !== user._id.toString()
          );

          // Add new reaction
          if (emoji) {
            message.reactions.push({
              userId: Types.ObjectId.createFromHexString(user._id.toString()),
              emoji,
            });
          }

          await message.save();
          console.log(message);

          // Get the chat to notify other participants
          const chat = await Chat.findById(chatId).populate<{
            participants: PopulatedUser[];
          }>("participants", "socketId");

          if (chat) {
            chat.participants.forEach((participant: PopulatedUser) => {
              console.log(emoji);
              io.to(participant.socketId).emit("messageReaction", {
                messageId,
                chatId,
                reaction: emoji
                  ? {
                      userId: user._id.toString(),
                      emoji,
                    }
                  : null,
                userId: user._id.toString(),
              });
            });
          }
        } catch (error) {
          console.error("Add reaction error:", error);
        }
      }
    );

    socket.on("disconnect", async () => {
      try {
        const user: any = await ChatUser.findOne({ socketId: socket.id });
        if (user) {
          await ChatUser.findByIdAndUpdate(user._id, {
            active: false,
            socketId: "",
          });
          console.log("user disconnected", user._id);
          io.emit("participantStatusUpdate", {
            participantId: user._id,
            status: user.status,
            active: false,
          });
        }
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    });

    socket.on(
      "updateStatus",
      async ({ status, userId }: { status: string; userId: string }) => {
        try {
          const user = await ChatUser.findByIdAndUpdate(
            userId,
            { status },
            { new: true }
          );

          if (user) {
            console.log("user status updated", user._id, status);
            console.log(user);
            io.emit("participantStatusUpdate", {
              participantId: user._id,
              status: status,
              active: user.active,
            });
          }
        } catch (error) {
          console.error("Update status error:", error);
        }
      }
    );
  });
};
export { io };
