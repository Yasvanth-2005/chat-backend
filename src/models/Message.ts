import mongoose, { Schema } from "mongoose";

interface IAttachment {
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

interface IMessage {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  body: string;
  type: "text" | "image" | "file";
  attachments: IAttachment[];
  isEdited: boolean;
  deletedFor: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const attachmentSchema = new Schema<IAttachment>({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, required: true },
  url: { type: String, required: true },
  preview: { type: String },
});

const messageSchema = new Schema<IMessage>({
  body: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "chatusers", required: true },
  chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
  type: { type: String, enum: ["text", "image", "file"], default: "text" },
  createdAt: { type: Date, default: Date.now },
  attachments: { type: [attachmentSchema], default: [] },
  isEdited: { type: Boolean, default: false },
  deletedFor: [{ type: Schema.Types.ObjectId, ref: "chatusers" }],
});

export default mongoose.model<IMessage>("Message", messageSchema);
