import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  content: string;
  userId: string;
  roomId?: string;
  chatId?: string;
  type: "room" | "direct";
  createdAt: Date;
}

const MessageSchema = new Schema({
  content: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
  },
  chatId: {
    type: Schema.Types.ObjectId,
    ref: "Chat",
  },
  type: {
    type: String,
    enum: ["room", "direct"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IMessage>("Message", MessageSchema);
