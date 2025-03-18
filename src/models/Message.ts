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

interface IMessage {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  body: string;
  type: "text" | "image" | "file";
  attachments: IAttachment[];
  isEdited: boolean;
  deletedFor: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  replyTo: mongoose.Types.ObjectId;
  createdAt: Date;
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

const messageSchema = new Schema<IMessage>({
  body: { type: String },
  senderId: { type: Schema.Types.ObjectId, ref: "chatusers", required: true },
  chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
  type: { type: String, enum: ["text", "image", "file"], default: "text" },
  createdAt: { type: Date, default: Date.now },
  attachments: { type: [attachmentSchema], default: [] },
  isEdited: { type: Boolean, default: false },
  deletedFor: [{ type: Schema.Types.ObjectId, ref: "chatusers" }],
  reactions: { type: [reactionSchema], default: [] },
  replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
});

export default mongoose.model<IMessage>("Message", messageSchema);
