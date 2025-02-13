import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  displayName: string;
  socketId: string;
  photoURL?: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  address?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  about?: string;
  role?: string;
  isPublic: boolean;
  active: boolean;
  createdAt: Date;
  lastActive: Date;
  id: Schema.Types.ObjectId;
}

const ChatUserSchema = new Schema<IUser>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
    unique: true,
  },
  socketId: {
    type: String,
    required: true,
  },
  photoURL: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  country: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
  state: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  zipCode: {
    type: String,
    default: "",
  },
  about: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    default: "",
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IUser>("chatusers", ChatUserSchema);
