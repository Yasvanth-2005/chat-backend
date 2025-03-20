import { Router } from "express";
import Chat from "../models/Chat";
import Message from "../models/Message";
import ChatUser from "../models/User";
import User from "../models/User";
import { io } from "../socket/socketManager";
import { deleteMessage } from "../controllers/message.controller";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const users = await ChatUser.find();
    res.json({ contacts: users });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/:userId/chats", async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.params.userId })
      .populate("participants")
      .populate({
        path: "lastMessage",
      });

    chats.sort((a: any, b: any) => {
      const dateA = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const dateB = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;

      console.log(dateB - dateA);
      return dateB - dateA;
    });

    res.json({ conversations: chats });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/chats/:chatId/messages", async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20 * page;

    // Get total count of messages
    const totalMessages = await Message.countDocuments({ chatId });

    // Get paginated messages
    const messages = await Message.find({ chatId })
      .populate("senderId", "displayName status active email phoneNumber")
      .populate("replyTo", "body attachments")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get chat participants
    const chat = await Chat.findById(chatId)
      .populate("participants", "displayName status active email phoneNumber")
      .lean();

    res.json({
      messages: messages.reverse(),
      participants: chat?.participants || [],
      hasMore: totalMessages > limit,
      total: totalMessages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/chats", async (req: any, res: any) => {
  try {
    const { userId, contact } = req.body;

    if (!userId || !contact?._id) {
      return res.status(400).json({ error: "Invalid user or contact" });
    }

    const user = await User.findById(userId);
    let contactUser = await User.findById(contact._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!contactUser) {
      contactUser = await User.create({ ...contact });
    }

    let chat = await Chat.findOne({
      participants: { $all: [userId, contactUser._id], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [userId, contactUser._id],
        lastMessage: null,
      });
    }

    const populatedChat: any = await Chat.findById(chat._id).populate<{
      participants: any;
    }>("participants", "displayName socketId active status");

    return res.status(200).json({ chat });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/chats/multiple", async (req: any, res: any) => {
  try {
    const { userId, recipients, message } = req.body;
    console.log(message, userId, recipients);

    if (!userId || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "Invalid user or recipients" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const recipientIds = await Promise.all(
      recipients.map(async (recipient: any) => {
        let contactUser = await User.findById(recipient._id);
        console.log(recipient);
        const newUser = {
          _id: recipient._id,
          displayName: `${recipient.firstname} ${recipient.lastname}`,
          email: recipient.email,
          about: "About",
          role: recipient.role,
          isPublic: true,
          country: recipient.billingAddress?.country || "India",
          address: recipient.billingAddress?.address || "90210 Broadway Blvd",
          state: recipient.billingAddress?.state || "California",
          city: recipient.billingAddress?.city || "San Francisco",
          zipCode: recipient.billingAddress?.postalCode || "94116",
          photoURL: recipient.profile_image,
          phoneNumber: recipient.phone,
        };

        if (!contactUser) {
          contactUser = await User.create(newUser);
        }
        return contactUser._id;
      })
    );

    const participants = [userId, ...recipientIds];

    let chat = await Chat.findOne({
      participants: { $all: participants, $size: participants.length },
    });

    if (!chat) {
      chat = await Chat.create({
        participants,
        lastMessage: null,
        isGroup: true,
      });
    }

    const newMessage = await Message.create({
      chatId: chat._id,
      senderId: userId,
      body: message.body,
      type: message.type,
      attachments: message.attachments,
    });

    console.log(`newMessage : ${newMessage}`);
    await Chat.findByIdAndUpdate(chat._id, { lastMessage: newMessage._id });

    const populatedChat: any = await Chat.findById(chat._id).populate<{
      participants: any;
    }>("participants", "displayName socketId active status");

    // Notify all participants about the new chat
    const onlineParticipants = populatedChat.participants.filter(
      (p: any) => p.socketId && p.socketId !== ""
    );
    console.log(onlineParticipants);

    onlineParticipants.forEach((participant: any) => {
      if (participant.socketId) {
        io.to(participant.socketId).emit("messageSent", {
          message: newMessage,
          chatId: populatedChat._id,
        });
      }
    });

    console.log(populatedChat);
    return res.status(200).json({ chat });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/chats/teams", async (req: any, res: any) => {
  try {
    const { name, userId, recipients, message } = req.body;
    console.log(message, name, userId, recipients);

    if (!userId || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "Invalid user or recipients" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const recipientIds = await Promise.all(
      recipients.map(async (recipient: any) => {
        let contactUser = await User.findById(recipient._id);
        console.log(recipient);
        if (!contactUser) {
          const newUser = {
            _id: recipient._id,
            displayName: `${recipient.firstname} ${recipient.lastname}`,
            email: recipient.email,
            about: "About",
            role: recipient.role.role,
            isPublic: true,
            country: recipient.billingAddress?.country || "India",
            address: recipient.billingAddress?.address || "90210 Broadway Blvd",
            state: recipient.billingAddress?.state || "California",
            city: recipient.billingAddress?.city || "San Francisco",
            zipCode: recipient.billingAddress?.postalCode || "94116",
          };
          contactUser = await User.create(newUser);
        }
        return contactUser._id;
      })
    );

    const participants = [userId, ...recipientIds];

    let chat = await Chat.findOneAndUpdate(
      {
        participants: { $all: participants, $size: participants.length },
      },
      { name },
      { new: true }
    );

    if (!chat) {
      chat = await Chat.create({
        name,
        participants,
        lastMessage: null,
        isGroup: true,
      });
    }

    const newMessage = await Message.create({
      chatId: chat._id,
      senderId: userId,
      body: message.body,
      type: message.type,
      attachments: message.attachments,
    });

    console.log(`newMessage : ${newMessage}`);
    await Chat.findByIdAndUpdate(chat._id, { lastMessage: newMessage._id });

    const populatedChat: any = await Chat.findById(chat._id).populate<{
      participants: any;
    }>("participants", "displayName socketId active status");

    const onlineParticipants = populatedChat.participants.filter(
      (p: any) => p.socketId && p.socketId !== ""
    );

    onlineParticipants.forEach((participant: any) => {
      if (participant.socketId) {
        io.to(participant.socketId).emit("messageSent", {
          message: newMessage,
          chatId: populatedChat._id,
        });
      }
    });

    return res.status(200).json({ chat: populatedChat });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/chats/:chatId", async (req: any, res: any) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    await Message.deleteMany({ chatId });

    await Chat.findByIdAndDelete(chatId);

    return res
      .status(200)
      .json({ message: "Chat and related messages deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Edit message
router.put("/chats/:chatId/messages/:messageId", async (req: any, res: any) => {
  try {
    const { chatId, messageId } = req.params;
    const { content, attachments } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.chatId.toString() !== chatId) {
      return res
        .status(403)
        .json({ error: "Message does not belong to this chat" });
    }

    message.body = content;
    message.attachments = attachments || [];
    message.isEdited = true;
    await message.save();

    // Get the chat and its last message
    const chat = await Chat.findById(chatId).populate("lastMessage");
    const lastMessage = chat?.lastMessage;

    // Emit socket event for real-time update with lastMessage
    io.to(chatId).emit("messageEdited", {
      chatId,
      messageId,
      content,
      attachments: message.attachments,
      lastMessage,
    });

    res.json({ message });
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
});

// Delete message
router.delete("/messages/:messageId", deleteMessage);

import jsPDF from "jspdf";

router.post("/export", async (req: any, res: any) => {
  try {
    const { conversationId, userId } = req.body;

    // Validate input
    if (!conversationId || !userId) {
      return res
        .status(400)
        .json({ error: "Missing conversationId or userId" });
    }

    console.log("Received conversationId:", conversationId); // Debug

    // Use chatId instead of conversationId in the query
    const messages = await Message.find({ chatId: conversationId })
      .sort({ createdAt: 1 })
      .populate("senderId", "displayName email");

    console.log("Messages fetched:", messages); // Debug: Check if messages are retrieved

    if (!messages || messages.length === 0) {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      doc.setFontSize(16);
      doc.text(`Chat Export - Conversation ${conversationId}`, 105, 20, {
        align: "center",
      });
      doc.setFontSize(12);
      doc.text("No messages found for this conversation", 10, 40);
      doc.text("Page 1", 105, 287, { align: "center" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=chat-${conversationId}.pdf`
      );
      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      return res.send(pdfBuffer);
    }

    // Create PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const margin = 10;
    const maxWidth = 190;
    const lineHeight = 7;
    let yPosition = 20;
    let pageNumber = 1;

    // Add header
    doc.setFontSize(16);
    doc.text(`Chat Export - Conversation ${conversationId}`, 105, yPosition, {
      align: "center",
    });
    yPosition += 15;

    // Process messages (no 10-message limit)
    messages.forEach((message: any) => {
      const senderName = message.senderId
        ? `${message.senderId.displayName}`.trim()
        : "Unknown";
      const messageType =
        message.attachments?.length > 0 ? "Attachment" : "Text";
      const messageContent = message.body || "[Attachment]";
      const timestamp = message.createdAt
        ? new Date(message.createdAt).toLocaleString()
        : "Unknown Time";

      const fullText = [
        `Time: ${timestamp}`,
        `Sender: ${senderName}`,
        `Type: ${messageType}`,
        `Message: ${messageContent}`,
        "-------------------",
      ].join("\n");

      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(fullText, maxWidth);
      const textHeight = splitText.length * lineHeight;

      // Check if we need a new page
      if (yPosition + textHeight > 260) {
        // 260mm leaves room for footer
        doc.setFontSize(10);
        doc.text(`Page ${pageNumber}`, 105, 287, { align: "center" });
        doc.addPage();
        yPosition = 20;
        pageNumber++;
      }

      doc.text(splitText, margin, yPosition);
      yPosition += textHeight + 5; // Add extra spacing between messages
    });

    // Add final page number
    doc.setFontSize(10);
    doc.text(`Page ${pageNumber}`, 105, 287, { align: "center" });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=chat-${conversationId}.pdf`
    );

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    console.log("PDF Buffer size:", pdfBuffer.length); // Debug
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Error exporting chat:", error);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    doc.setFontSize(16);
    doc.text("Chat Export Error", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Error: ${error.message || "Unknown error occurred"}`, 10, 40);
    doc.text("Page 1", 105, 287, { align: "center" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=chat-any-error.pdf`
    );
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.send(pdfBuffer);
  }
});

export default router;
