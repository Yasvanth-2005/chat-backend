import { Document, Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  socketId: string;
  active?: boolean;
  createdAt: Date;
  lastActive: Date;
}

export interface IRoom extends Document {
  name: string;
  users: Types.ObjectId[];
  createdAt: Date;
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
  userJoined: (data: { user: IUser; room: IRoom }) => void;
  chatStarted: (chat: IChat) => void;
  directMessage: (data: { chatId: string; message: IMessage }) => void;
  message: (message: IMessage) => void;
  roomCreated: (room: IRoom) => void;
  messageHistory: (messages: IMessage[]) => void;
  userLeft: (data: { userId: string; room: IRoom }) => void;
}

export interface ClientToServerEvents {
  join: (data: { username: string }) => void;
  startChat: (data: { userId: string }) => void;
  directMessage: (data: { chatId: string; content: string }) => void;
  message: (data: { content: string; roomId: string }) => void;
  createRoom: (data: { name: string }) => void;
  joinRoom: (data: { roomId: string }) => void;
}
