import { Request, Response } from "express";
import { User } from "../models/User";
import { Message } from "../models/Messages";

export const getUsersInTeam = async (req: Request, res: Response) => {
  const { teamId } = req.params;

  try {
    const users = await User.find({ team: teamId });
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [{ sender: user._id }, { receiver: user._id }],
        }).sort({ timestamp: -1 });

        return {
          ...user.toObject(),
          lastMessage: lastMessage?.content || "No messages yet",
        };
      })
    );

    res.status(200).json(usersWithLastMessage);
  } catch (error: any) {
    res.status(500).json({ error: error?.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const {username , email} = await req.body
  try {
    const user =new User({
      username , 
      email , 
      teamId:"67969b99cd12a4f8567d2045"
    })
    await user.save()
    res.json(user).status(201)
  } catch (error) {
    res.json(error).status(400)

  }
};
export const updateUserStatus = async (
  userId: string,
  isOnline: boolean,
  socketId: string | null
) => {
  const res = await User.findByIdAndUpdate(userId, { isOnline, socketId });
  console.log(res);
};

export const updateUserStatusasOfffline = async (socketId: string | null) => {
  const res = await User.findOneAndUpdate(
    {
      socketId,
    },
    { isOnline: false }
  );
  console.log(res);
};
