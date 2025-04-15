import mongoose, { Schema } from "mongoose";

interface IAttachment {
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
}

interface IDeletedFor {
  userId: mongoose.Types.ObjectId;
  deletedAt: Date;
}

interface IMessage {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  body: string;
  type: "text" | "image" | "file";
  attachments: IAttachment[];
  isEdited: boolean;
  reactions: IReaction[];
  replyTo: mongoose.Types.ObjectId;
  createdAt: Date;
  deletedFor: IDeletedFor[];
}

const attachmentSchema = new Schema<IAttachment>({
  name: { type: String },
  size: { type: Number },
  type: { type: String },
  url: { type: String },
  preview: { type: String },
});

const reactionSchema = new Schema<IReaction>({
  userId: { type: Schema.Types.ObjectId, ref: "chatusers", required: true },
  emoji: { type: String, required: true },
});

const deletedForSchema = new Schema<IDeletedFor>({
  userId: { type: Schema.Types.ObjectId, ref: "chatusers", required: true },
  deletedAt: { type: Date, default: Date.now },
});

const messageSchema = new Schema<IMessage>({
  body: { type: String },
  senderId: { type: Schema.Types.ObjectId, ref: "chatusers", required: true },
  chatId: { type: Schema.Types.ObjectId, ref: "chats", required: true },
  type: {
    type: String,
    enum: ["text", "image", "file", "system"],
    default: "text",
  },
  createdAt: { type: Date, default: Date.now },
  attachments: { type: [attachmentSchema], default: [] },
  isEdited: { type: Boolean, default: false },
  reactions: { type: [reactionSchema], default: [] },
  replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
  deletedFor: { type: [deletedForSchema], default: [] },
});

export default mongoose.model<IMessage>("Message", messageSchema);
