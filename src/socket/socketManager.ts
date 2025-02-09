import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import User, { IUser } from "../models/User";
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

      socket.on("join", async ({ username }) => {
        try {
          let user = await User.findOne({ username });

          if (user) {
            user.socketId = socket.id;
            await user.save();

            console.log(
              `User ${username} reconnected with new socket ID: ${socket.id}`
            );
          } else {
            user = await User.create({ username, socketId: socket.id });
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
            ).populate("users", "username socketId");

            io.to(generalRoom._id.toString()).emit("userJoined", {
              user: user.toJSON(),
              room: populatedRoom.toJSON(),
            });

            const messages: any = await Message.find({
              roomId: generalRoom._id,
              type: "room",
            }).populate("userId", "username");

            socket.emit(
              "messageHistory",
              messages.map((m: any) => m.toJSON())
            );
          }
        } catch (error) {
          console.error("Join error:", error);
        }
      });

      socket.on("startChat", async ({ userId }) => {
        try {
          const currentUser = await User.findOne({ socketId: socket.id });
          const otherUser = await User.findById(userId);

          if (currentUser && otherUser) {
            const chat = await Chat.create({
              participants: [currentUser._id, otherUser._id],
            });

            const populatedChat: any = await Chat.findById(chat._id).populate<{
              participants: PopulatedUser[];
            }>("participants", "username socketId");

            if (populatedChat) {
              [currentUser, otherUser].forEach((user) => {
                io.to(user.socketId).emit(
                  "chatStarted",
                  populatedChat.toJSON()
                );
              });
            }
          }
        } catch (error) {
          console.error("Start chat error:", error);
        }
      });

      socket.on("directMessage", async ({ chatId, content }) => {
        try {
          const user: any = await User.findOne({ socketId: socket.id });
          const chat: any = await Chat.findById(chatId).populate<{
            participants: PopulatedUser[];
          }>("participants", "socketId username");

          if (user && chat) {
            const message = await Message.create({
              content,
              userId: user._id,
              chatId: new Types.ObjectId(chatId),
              type: "direct",
            });

            chat.lastMessage = message._id;
            await chat.save();

            const populatedMessage: any = await Message.findById(
              message._id
            ).populate<{ userId: PopulatedUser }>("userId", "username");

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
      });

      socket.on("message", async ({ content, roomId }) => {
        try {
          const user = await User.findOne({ socketId: socket.id });
          if (user) {
            const message = await Message.create({
              content,
              userId: user._id,
              roomId: new Types.ObjectId(roomId),
              type: "room",
            });

            const populatedMessage: any = await Message.findById(
              message._id
            ).populate<{ userId: PopulatedUser }>("userId", "username");

            if (populatedMessage) {
              io.to(roomId).emit("message", populatedMessage.toJSON());
            }
          }
        } catch (error) {
          console.error("Message error:", error);
        }
      });

      socket.on("createRoom", async ({ name }) => {
        try {
          const room: any = await Room.create({
            name,
            users: [],
          });
          io.emit("roomCreated", room.toJSON());
        } catch (error) {
          console.error("Create room error:", error);
        }
      });

      socket.on("joinRoom", async ({ roomId }) => {
        try {
          const user: any = await User.findOne({ socketId: socket.id });
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
            }>("users", "username socketId");

            if (populatedRoom) {
              io.to(roomId).emit("userJoined", {
                user: user.toJSON(),
                room: populatedRoom.toJSON(),
              });

              const messages: any = await Message.find({
                roomId: new Types.ObjectId(roomId),
                type: "room",
              }).populate<{ userId: PopulatedUser }>("userId", "username");

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
          const user: any = await User.findOne({ socketId: socket.id });
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
                users: any;
              }>("users", "username socketId");

              if (populatedRoom) {
                io.to(room._id.toString()).emit("userLeft", {
                  userId: user._id.toString(),
                  room: populatedRoom.toJSON(),
                });
              }
            }

            await User.findByIdAndUpdate(user._id, { active: true });
          }
        } catch (error) {
          console.error("Disconnect error:", error);
        }
      });
    }
  );
};
