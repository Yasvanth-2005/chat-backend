import mongoose, { Schema, Document } from "mongoose";

export interface IAttachment {
  name?: string;
  size?: number;
  type?: string;
  path?: string;
  preview?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface IMessage extends Document {
  body: string;
  senderId: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  contentType: string;
  createdAt: Date;
  attachments: IAttachment[];
}

const ChatAttachmentSchema = new Schema<IAttachment>({
  name: { type: String },
  size: { type: Number },
  type: { type: String },
  path: { type: String },
  preview: { type: String },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});

const ChatMessageSchema = new Schema<IMessage>({
  body: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "chatusers", required: true },
  chatId: { type: Schema.Types.ObjectId, ref: "Chat" },
  roomId: { type: Schema.Types.ObjectId, ref: "Room" },
  contentType: { type: String, default: "text" },
  createdAt: { type: Date, default: Date.now },
  attachments: { type: [ChatAttachmentSchema], default: [] },
});

export default mongoose.model<any>("messages", ChatMessageSchema);
