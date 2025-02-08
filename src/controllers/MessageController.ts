import { Request, Response } from "express";
import { Message } from "../models/Messages";

export const getMessagesBetweenUsers = async (req: Request, res: Response) => {
  const { userId1, userId2 } = req.params;
  
  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    }).sort({ timestamp: 1 });
    
    console.log(messages)
    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error?.message });
  }
};

export const Storemessage = async (
  senderId: string,
  receiverId: string,
  content: string
) => {
  try {
    const newMessage = new Message({
      senderId,
      receiverId,
      content,
    });
    await newMessage.save();
    return newMessage;
  } catch (error: any) {
    console.log("error while storing messages", error?.message);
  }
};
