import { Server, Socket } from "socket.io";
import {
  updateUserStatus,
  updateUserStatusasOfffline,
} from "../controllers/UserController";
import { Storemessage } from "../controllers/MessageController";

const userSocketMap = new Map<string, string>(); // Maps userId to socketId

export const setupSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", async ({ userId }) => {
      userSocketMap.set(userId, socket.id); // Store userId -> socketId mapping
      await updateUserStatus(userId, true, socket.id);
      console.log(`User ${userId} mapped to socket ${socket.id}`);
    });

    socket.on("sendMessage",async (data) => {
      const { senderId, receiverId, content } = data;
      console.log(
        `Sending message from ${senderId} to ${receiverId}: ${content}`
      );
      await Storemessage(senderId, receiverId, content);
      const receiverSocketId = userSocketMap.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", {
          senderId,
          content,
        });
        console.log(`Message sent to ${receiverSocketId}`);
      } else {
        console.log("Receiver is offline or not connected.");
      }
    });

    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      // Find userId by socketId and remove mapping
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          await updateUserStatusasOfffline(userId);
          console.log(`User ${userId} is now offline.`);
          break;
        }
      }
    });
  });
};
