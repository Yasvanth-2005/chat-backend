// sender.js
const io = require("socket.io-client");
const mongoose = require("mongoose");

const socket = io("http://localhost:3000");

// Function to validate ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Replace these with actual IDs
const userId = "67a26199489a9e5ab6d4bc7a";
const senderId = "67a26199489a9e5ab6d4bc7a";
const receiverId = "67a261b1489a9e5ab6d4bc7c";

// Validate IDs before connecting or emitting
if (
  !isValidObjectId(userId) ||
  !isValidObjectId(senderId) ||
  !isValidObjectId(receiverId)
) {
  process.exit(1); // Exit the script if IDs are invalid
}

socket.on("connect", () => {
  // Emit 'join' event with userId
  socket.emit("join", { userId }, (response) => {
    if (response.error) {
      console.error("Join error:", response.error);
      return;
    }
  });

  // Send a message every 5 seconds
  const intervalId = setInterval(() => {
    socket.emit(
      "sendMessage",
      {
        senderId,
        receiverId,
        content: "Hello! This is a periodic message.",
      },
      (response) => {
        if (response.error) {
          console.error("SendMessage error:", response.error);
          return;
        }
        // console.log("Message sent successfully:", response.message);
      }
    );
  }, 5000); // 5000 ms = 5 seconds

  // Handle disconnect event
  socket.on("disconnect", () => {
    // console.log("Disconnected from server");
    clearInterval(intervalId); // Stop sending messages when disconnected
  });

  // Listen for 'receiveMessage' event
  socket.on("receiveMessage", (message) => {
    // console.log("Message received:", message);
  });
});
