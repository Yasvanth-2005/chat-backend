import mongoose, { Schema, Document, Types } from "mongoose";

interface IMessage extends Document {
  senderId: Types.ObjectId; // Sender user ID
  receiverId: Types.ObjectId; // Receiver user ID
  content: string; // Message text
  timestamp: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
