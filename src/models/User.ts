import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  socketId: string;
  createdAt: Date;
  lastActive: Date;
}

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  socketId: {
    type: String,
    required: true,
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

export default mongoose.model<IUser>("User", UserSchema);
