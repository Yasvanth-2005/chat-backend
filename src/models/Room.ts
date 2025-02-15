import mongoose, { Schema, Document } from "mongoose";

export interface IRoom extends Document {
  name: string;
  users: string[];
  createdAt: Date;
}

const RoomSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  users: [
    {
      type: Schema.Types.ObjectId,
      ref: "chatusers",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IRoom>("rooms", RoomSchema);
