import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  participants: string[];
  lastMessage?: string;
  createdAt: Date;
}

const ChatSchema = new Schema({
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "Message",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IChat>("chats", ChatSchema);
