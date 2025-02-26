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
            console.log("test message", chatId);
            console.log(`content: ${content}`);
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

      socket.on(
        "deleteMessage",
        async ({
          messageId,
          chatId,
        }: {
          messageId: string;
          chatId: string;
        }) => {
          try {
            // Find the user who is trying to delete the message
            const user: any = await ChatUser.findOne({ socketId: socket.id });

            if (!user) {
              console.error("User not found");
              return;
            }

            // Find the message and verify ownership
            const message = await Message.findById(messageId);

            if (!message) {
              console.error("Message not found");
              return;
            }

            // Verify the message belongs to the chat
            if (message.chatId.toString() !== chatId) {
              console.error("Message does not belong to this chat");
              return;
            }

            // Verify the user is either the sender or has permission
            if (message.senderId.toString() !== user._id.toString()) {
              console.error("User not authorized to delete this message");
              return;
            }

            // Delete the message
            await Message.findByIdAndDelete(messageId);

            // Get the chat to notify other participants
            const chat = await Chat.findById(chatId).populate<{
              participants: PopulatedUser[];
            }>("participants", "socketId");

            if (chat) {
              // Notify all participants in the chat about the deleted message
              chat.participants.forEach((participant: PopulatedUser) => {
                io.to(participant.socketId).emit(
                  "messageDeleted",
                  messageId,
                  chatId
                );
              });
            }

            // If this was the last message, update the chat's lastMessage
            if (chat?.lastMessage?.toString() === messageId) {
              // Find the new last message
              const newLastMessage = await Message.findOne({ chatId: chatId })
                .sort({ createdAt: -1 })
                .limit(1);

              chat.lastMessage = newLastMessage?._id || null;
              await chat.save();

              // Notify participants about the updated last message
              chat.participants.forEach((participant: PopulatedUser) => {
                io.to(participant.socketId).emit(
                  "chatUpdated",
                  chatId,
                  newLastMessage
                );
              });
            }
          } catch (error) {
            console.error("Delete message error:", error);
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
