import mongoose, { Schema, Document, Types } from "mongoose";

interface IUser extends Document {
  username: string;
  email: string;
  teamId: Types.ObjectId; // References the team the user belongs to
  isOnline: boolean; // Online status
  socketId: string | null; // Socket ID for real-time messaging
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  isOnline: { type: Boolean, default: false },
  socketId: { type: String, default: null },
});

export const User = mongoose.model<IUser>("User", UserSchema);
