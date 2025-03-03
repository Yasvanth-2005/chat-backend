import { Document, Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  socketId: string;
  active?: boolean;
  createdAt: Date;
  lastActive: Date;
}

export interface IMessage extends Document {
  content: string;
  userId: Types.ObjectId;
  roomId?: Types.ObjectId;
  chatId?: Types.ObjectId;
  type: "room" | "direct";
  createdAt: Date;
}

export interface IChat extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdAt: Date;
}

export interface ServerToClientEvents {
  userJoined: (data: { user: IUser }) => void;
  messageDeleted: (messageId: any, chatId: any) => void;
  chatUpdated: (chatId: any, newLastMessage: any) => void;
  chatStarted: (chat: IChat) => void;
  messageSent: (message: any) => void;
  directMessage: (data: { chatId: string; message: IMessage }) => void;
  message: (message: any) => void;
  deleteMessage: (messageId: any, chatId: any) => void;
  messageHistory: (messages: any) => void;
  participantStatusUpdate: (data: {
    participantId: any;
    status: any;
    active: boolean;
  }) => void;
}

export interface ClientToServerEvents {
  join: (data: { username: string }) => void;
  startChat: (data: { userId: string }) => void;
  directMessage: (data: { chatId: string; content: string }) => void;
  message: (data: { content: string; roomId: string }) => void;
  deleteMessage: (messageId: any, chatId: any) => void;
  updateStatus: (data: { status: string; userId: string }) => void;
}
