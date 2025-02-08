import mongoose, { Schema, Document } from "mongoose";

interface ITeam extends Document {
    name: string;
    members: string[]; // Array of User IDs
  }
  
  const TeamSchema = new Schema<ITeam>({
    name: { type: String, required: true },
    members: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  });
  
  export const Team = mongoose.model<ITeam>("Team", TeamSchema);
  