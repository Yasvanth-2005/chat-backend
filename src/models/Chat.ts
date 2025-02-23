import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  participants: string[];
  lastMessage?: string;
  createdAt: Date;
}

const ChatSchema = new Schema({
  name: {
    type: String,
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "chatusers",
    },
  ],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "messages",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IChat>("chats", ChatSchema);
