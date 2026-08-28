import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import socket from "../socket";
import UserList from "../components/UserList.jsx";
import ChatThread from "../components/ChatThread.jsx";

export default function Chat({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unread, setUnread] = useState({}); // { userId: count }
  const [messages, setMessages] = useState([]);
  const [readBy, setReadBy] = useState(new Set());
  const [mobileView, setMobileView] = useState("list");
  const navigate = useNavigate();

  // Load the contact list.
  useEffect(() => {
    api.get("/chat/users").then((res) => setUsers(res.data)).catch(() => {});
  }, []);

  // Make sure the socket is connected on this page.
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("chat:online", ({ ids, count }) => {
      setOnlineUsers(ids.filter((id) => id !== user._id));
      setOnlineCount(count - 1);
    });
  }, []);

  // ---------- SOCKET LISTENERS ----------
  useEffect(() => {
    const onOnlineCount = (count) => setOnlineCount(count - 1);
    const onOnlineUsers = (ids) => setOnlineUsers(ids.filter((id) => id !== user._id));

    const onChatMessage = (msg) => {
      if (activeUser && (msg.from === activeUser._id || msg.to === activeUser._id)) {
        setMessages((prev) => [...prev, msg]);
      } else {
        const otherId = msg.from === user._id ? msg.to : msg.from;
        setUnread((prev) => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
      }
    };

    const onUnreadUpdate = ({ userId: uid, count }) => {
      setUnread((prev) => ({ ...prev, [uid]: count }));
    };

    socket.on("online:count", onOnlineCount);
    socket.on("online:users", onOnlineUsers);
    socket.on("chat:message", onChatMessage);
    socket.on("chat:unread:update", onUnreadUpdate);
    socket.on("chat:read:receipt", ({ by, messageIds }) => {
      if (activeUser && by === activeUser._id) {
        setReadBy((prev) => {
          const next = new Set(prev);
          messageIds.forEach((id) => next.add(id));
          return next;
        });
      }
    });

    socket.emit("chat:unread", (data) => {
      const map = {};
      data.forEach((item) => { map[item.userId] = item.count; });
      setUnread(map);
    });

    return () => {
      socket.off("online:count", onOnlineCount);
      socket.off("online:users", onOnlineUsers);
      socket.off("chat:message", onChatMessage);
      socket.off("chat:unread:update", onUnreadUpdate);
      socket.off("chat:read:receipt");
    };
  }, [activeUser, user._id]);

  // ---------- OPEN A CHAT ----------
  const openChat = (other) => {
    setActiveUser(other);
    setMessages([]);
    setReadBy(new Set());
    setMobileView("chat");

    socket.emit("chat:history", other._id, (data) => {
      setMessages(data);
      const readIds = new Set();
      data.forEach((m) => {
        if (m.from === user._id && m.read) readIds.add(m._id);
      });
      setReadBy(readIds);
    });
    socket.emit("chat:read", other._id);
    setUnread((prev) => ({ ...prev, [other._id]: 0 }));
  };

  // ---------- SEND A MESSAGE ----------
  const sendMessage = (text) => {
    if (!text.trim() || !activeUser) return;
    socket.emit("chat:send", { to: activeUser._id, text });
  };

  const logout = async () => {
    await api.post("/auth/logout");
    socket.disconnect();
    onLogout();
    navigate("/login");
  };

  return (
    <div className="app">
      <div className={"side" + (mobileView === "chat" ? " hide-mobile" : "")}>
        <UserList
          me={user}
          users={users}
          activeUser={activeUser}
          unread={unread}
          onlineCount={onlineCount}
          onlineUsers={onlineUsers}
          onSelect={openChat}
          onLogout={logout}
        />
      </div>
      <div className={"main" + (mobileView === "list" ? " hide-mobile" : "")}>
        {activeUser ? (
          <ChatThread
            me={user}
            other={activeUser}
            messages={messages}
            readBy={readBy}
            onlineUsers={onlineUsers}
            onSend={sendMessage}
            onBack={() => setMobileView("list")}
          />
        ) : (
          <div className="empty">
            <div className="empty-icon">💬</div>
            <h3>WhatsApp Style Chat</h3>
            <p>Select a user from the left to start chatting.</p>
            <span className="online-pill">Online users: {onlineCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
