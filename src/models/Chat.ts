import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  name?: string;
  participants: string[];
  lastMessage?: string;
  createdAt: Date;
  deletedFor: IDeletedFor[];
}

interface IDeletedFor {
  userId: mongoose.Types.ObjectId;
  lastMessageTime: Date;
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
    ref: "Message",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deletedFor: {
    type: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "chatusers",
          required: true,
        },
        lastMessageTime: { type: Date, required: true },
      },
    ],
    default: [],
  },
});

export default mongoose.model<IChat>("chats", ChatSchema);
