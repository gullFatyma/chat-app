const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const Message = require("./models/Message");

// userId -> number of open sockets for that user
const onlineUsers = new Map();

function getOnlineCount() {
  return onlineUsers.size;
}

function addUser(userId) {
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
}

function removeUser(userId) {
  const count = (onlineUsers.get(userId) || 1) - 1;
  if (count <= 0) onlineUsers.delete(userId);
  else onlineUsers.set(userId, count);
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // ---- DONE FOR YOU: JWT check during the handshake ----
  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie || "";
      const token = cookie.parse(raw).token;
      if (!token) return next(new Error("No token"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id };
      next();
    } catch (err) {
      next(new Error("Not authorised"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    // Each user joins a room named after their own id.
    // Sending to a room means every tab of that user gets the event.
    socket.join(userId);

    addUser(userId);
    console.log("Connected:", userId, "| online:", getOnlineCount());

    // ================= EVENT 1: online:count =================
    // A user just connected -> tell EVERY browser the new online count.
    // We also send the list of online user ids so the client can draw a
    // green dot on each user who is currently online.
    io.emit("online:count", getOnlineCount());
    io.emit("online:users", [...onlineUsers.keys()]);

    // ================= EVENT 2: chat:history =================
    // The browser sends the other user's id and waits for the old messages.
    // "ack" is the callback the browser passed in socket.emit(...) — we call
    // it to send the result straight back to that one browser.
    socket.on("chat:history", async (withUserId, ack) => {
      try {
        // Messages of THIS one-to-one chat go in both directions:
        // (me -> other) OR (other -> me).
        const messages = await Message.find({
          $or: [
            { from: userId, to: withUserId },
            { from: withUserId, to: userId },
          ],
        }).sort({ createdAt: 1 }); // 1 = oldest first

        if (typeof ack === "function") ack(messages);
      } catch (err) {
        if (typeof ack === "function") ack([]);
      }
    });

    // ================= EVENT 3: chat:send =================
    // The browser sends { to, text }. We save it, then push it live to both
    // people, and bump the receiver's unread badge for me (the sender).
    socket.on("chat:send", async ({ to, text }, ack) => {
      try {
        const clean = (text || "").trim();
        if (!clean || !to) return; // ignore empty messages / bad data

        // 1) save in MongoDB (unread by default)
        const message = await Message.create({
          from: userId,
          to,
          text: clean,
          read: false,
        });

        // 2) deliver instantly to the sender's tabs AND the receiver's tabs
        io.to(userId).emit("chat:message", message);
        io.to(to).emit("chat:message", message);

        // 3) recalculate how many of MY messages the receiver has not read,
        //    and tell the receiver to update that badge (EVENT 6).
        const count = await Message.countDocuments({ from: userId, to, read: false });
        io.to(to).emit("chat:unread:update", { userId, count });

        if (typeof ack === "function") ack({ ok: true });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false });
      }
    });

    // ================= EVENT 4: chat:unread =================
    // When the chat page loads, the browser asks: how many unread messages do
    // I have from each user? We reply with a list like [{ userId, count }].
    socket.on("chat:unread", async (ack) => {
      try {
        // every unread message that was sent TO me
        const msgs = await Message.find({ to: userId, read: false }).select("from");

        // count them, grouped by who sent them
        const counts = {};
        msgs.forEach((m) => {
          const senderId = m.from.toString();
          counts[senderId] = (counts[senderId] || 0) + 1;
        });

        const list = Object.keys(counts).map((id) => ({ userId: id, count: counts[id] }));
        if (typeof ack === "function") ack(list);
      } catch (err) {
        if (typeof ack === "function") ack([]);
      }
    });

    // ================= EVENT 5: chat:read =================
    // The browser says "I just opened this chat with fromUserId".
    // Mark those messages read, then tell my own tabs the badge is now 0.
    socket.on("chat:read", async (fromUserId) => {
      try {
        await Message.updateMany(
          { from: fromUserId, to: userId, read: false },
          { $set: { read: true } }
        );
        io.to(userId).emit("chat:unread:update", { userId: fromUserId, count: 0 });
      } catch (err) {
        // ignore
      }
    });

    // ================= EVENT 6: chat:unread:update =================
    // Note: this event is only SENT by the server (see chat:send and
    // chat:read above). The browser just listens for it to move the badge.

    // ================= BONUS: chat:typing =================
    // Not saved in the database. Just forward "I am typing" to the other user.
    socket.on("chat:typing", ({ to }) => {
      if (to) io.to(to).emit("chat:typing", { from: userId });
    });

    socket.on("disconnect", () => {
      removeUser(userId);
      console.log("Disconnected:", userId, "| online:", getOnlineCount());
      // A user (or one of their tabs) left -> refresh the online count and
      // the online id list for everyone.
      io.emit("online:count", getOnlineCount());
      io.emit("online:users", [...onlineUsers.keys()]);
    });
  });

  return io;
}

module.exports = initSocket;
