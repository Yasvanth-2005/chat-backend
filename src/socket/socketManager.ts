import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import ChatUser, { IUser } from "../models/User";
import Room, { IRoom } from "../models/Room";
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

          const generalRoom: any = await Room.findOne({ name: "General" });

          if (generalRoom) {
            socket.join(generalRoom._id.toString());

            if (!generalRoom.users.includes(user._id)) {
              generalRoom.users.push(user._id);
              await generalRoom.save();
            }

            const populatedRoom: any = await Room.findById(
              generalRoom._id
            ).populate("users", "displayName socketId");

            io.to(generalRoom._id.toString()).emit("userJoined", {
              user: user.toJSON(),
              room: populatedRoom?.toJSON(),
            });

            const messages: any = await Message.find({
              roomId: generalRoom._id,
              type: "room",
            }).populate("userId", "displayName");

            socket.emit(
              "messageHistory",
              messages.map((m: any) => m.toJSON())
            );
          }
        } catch (error) {
          console.error("Join error:", error);
        }
      });

      socket.on(
        "startChat",
        async ({ userId, contact }: { userId: string; contact?: any }) => {
          try {
            console.log("Hmmmm......");
            console.log("userId: " + userId, contact);
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

            console.log(chat);
            if (!chat) {
              chat = await Chat.create({
                participants: [currentUser._id, otherUser._id],
              });
            }

            const populatedChat: any = await Chat.findById(chat._id).populate<{
              participants: any;
            }>("participants", "displayName socketId");

            if (populatedChat) {
              [currentUser, otherUser].forEach((user) => {
                if (user.socketId !== "none") {
                  io.to(user.socketId).emit(
                    "chatStarted",
                    populatedChat.toJSON()
                  );
                }
              });
            }
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
                  io.to(participant.socketId).emit("directMessage", {
                    chatId,
                    message: populatedMessage.toJSON(),
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

      socket.on("createRoom", async ({ name }: { name: string }) => {
        try {
          const room: any = await Room.create({ name, users: [] });
          io.emit("roomCreated", room.toJSON());
        } catch (error) {
          console.error("Create room error:", error);
        }
      });

      socket.on("joinRoom", async ({ roomId }: { roomId: string }) => {
        try {
          const user: any = await ChatUser.findOne({ socketId: socket.id });
          const room: any = await Room.findById(roomId);

          if (user && room) {
            await Room.updateMany(
              { users: user._id },
              { $pull: { users: user._id } }
            );

            socket.join(roomId);
            room.users.push(user._id);
            await room.save();

            const populatedRoom: any = await Room.findById(room._id).populate<{
              users: PopulatedUser[];
            }>("users", "displayName socketId");

            if (populatedRoom) {
              io.to(roomId).emit("userJoined", {
                user: user.toJSON(),
                room: populatedRoom.toJSON(),
              });

              const messages: any = await Message.find({
                roomId: new Types.ObjectId(roomId),
                type: "room",
              }).populate<{ userId: PopulatedUser }>("userId", "displayName");

              socket.emit(
                "messageHistory",
                messages.map((m: any) => m.toJSON())
              );
            }
          }
        } catch (error) {
          console.error("Join room error:", error);
        }
      });

      socket.on("disconnect", async () => {
        try {
          const user: any = await ChatUser.findOne({ socketId: socket.id });
          if (user) {
            const rooms: any = await Room.find({ users: user._id });

            for (const room of rooms) {
              room.users = room.users.filter(
                (u: any) => u.toString() !== user._id.toString()
              );
              await room.save();

              const populatedRoom: any = await Room.findById(
                room._id
              ).populate<{
                users: PopulatedUser[];
              }>("users", "displayName socketId");

              if (populatedRoom) {
                io.to(room._id.toString()).emit("userLeft", {
                  userId: user._id.toString(),
                  room: populatedRoom.toJSON(),
                });
              }
            }

            await ChatUser.findByIdAndUpdate(user._id, { active: false });
          }
        } catch (error) {
          console.error("Disconnect error:", error);
        }
      });
    }
  );
};
