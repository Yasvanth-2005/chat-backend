import { Router } from "express";
import Room from "../models/Room";
import Message from "../models/Message";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().populate("users", "username");
    const roomList = rooms.map((room) => ({
      id: room._id,
      name: room.name,
      userCount: room.users.length,
    }));
    res.json(roomList);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:roomId/messages", async (req, res) => {
  try {
    const messages = await Message.find({
      roomId: req.params.roomId,
      type: "room",
    }).populate("userId", "username");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:roomId/users", async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate(
      "users",
      "username"
    );
    if (room) {
      res.json(room.users);
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
