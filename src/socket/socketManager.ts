import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import ChatUser, { IUser } from "../models/User";
import Message, { IMessage } from "../models/Message";
import Chat, { IChat } from "../models/Chat";
import type { ServerToClientEvents, ClientToServerEvents } from "../types";

interface PopulatedUser extends Omit<IUser, "socketId"> {
  socketId: string;
}

export const setupSocket = (
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  io.on(
    "connection",
    async (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log("User connected:", socket.id);

      socket.on("join", async (userData: any) => {
        try {
          let user: any = await ChatUser.findOne({
            displayName: userData.displayName,
          });

          if (user) {
            user.socketId = socket.id;
            await user.save();
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
            console.log(currentUser);
            console.log(otherUser);

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
            }>("participants", "displayName socketId");

            console.log(populatedChat);
            return populatedChat;
          } catch (error) {
            console.error("Start chat error:", error);
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
            }>("participants", "socketId displayName");

            if (user && chat) {
              const message = await Message.create({
                body: content.body,
                senderId: user._id,
                chatId: new Types.ObjectId(chatId),
                type: content.type,
                attachments: content.attachments,
              });

              chat.lastMessage = message._id;
              await chat.save();

              const populatedMessage: any = await Message.findById(
                message._id
              ).populate<{ senderId: PopulatedUser }>(
                "senderId",
                "displayName"
              );

              console.log(populatedMessage);

              if (populatedMessage) {
                chat.participants.forEach((participant: any) => {
                  if (participant.socketId !== socket.id) {
                    console.log(`Sending message to: ${participant.socketId}`);
                    io.to(participant.socketId).emit("messageSent", {
                      message: populatedMessage,
                      chatId: chatId,
                    });
                  }
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
              ).populate<{ userId: PopulatedUser }>("userId", "displayName");

              if (populatedMessage) {
                io.to(roomId).emit("message", populatedMessage.toJSON());
              }
            }
          } catch (error) {
            console.error("Message error:", error);
          }
        }
      );

      socket.on("disconnect", async () => {
        try {
          const user: any = await ChatUser.findOne({ socketId: socket.id });
          if (user) {
            await ChatUser.findByIdAndUpdate(user._id, { active: false });
          }
        } catch (error) {
          console.error("Disconnect error:", error);
        }
      });
    }
  );
};
