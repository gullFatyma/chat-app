import { useState, useEffect, useRef } from "react";
import socket from "../socket";

const time = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const lastSeenText = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "last seen today at " + time(d);
  return "last seen " + d.toLocaleDateString([], { day: "numeric", month: "short" }) + " at " + time(d);
};

export default function ChatThread({ me, other, messages, readBy, onlineUsers, onSend, onBack }) {
  const [text, setText] = useState("");
  const [lastSeen, setLastSeen] = useState(null);
  const [typing, setTyping] = useState(false);
  const bottom = useRef(null);
  const typingTimeout = useRef(null);
  const isOnline = onlineUsers.includes(other._id);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setLastSeen(null);
    socket.emit("chat:lastseen", other._id, (date) => setLastSeen(date));
  }, [other._id]);

  useEffect(() => {
    const onOnlineUsers = (ids) => {
      if (!ids.includes(other._id)) {
        socket.emit("chat:lastseen", other._id, (date) => setLastSeen(date));
      }
    };
    socket.on("online:users", onOnlineUsers);
    return () => socket.off("online:users", onOnlineUsers);
  }, [other._id]);

  useEffect(() => {
    const onTyping = ({ from }) => {
      if (from === other._id) {
        setTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTyping(false), 2000);
      }
    };
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:typing", onTyping);
      clearTimeout(typingTimeout.current);
    };
  }, [other._id]);

  const handleType = (e) => {
    setText(e.target.value);
    socket.emit("chat:typing", { to: other._id });
  };

  const send = () => {
    onSend(text);
    setText("");
  };

  return (
    <>
      <div className="main-head">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="avatar grey">{other.name.charAt(0).toUpperCase()}</div>
        <div>
          <div className="name">{other.name}</div>
          <div className={"small " + (isOnline ? "green" : "muted")}>
            {isOnline ? "online" : lastSeenText(lastSeen)}
          </div>
        </div>
      </div>

      <div className="body">
        {messages.length === 0 && <p className="muted center-text">No messages yet.</p>}
        {messages.map((m) => {
          const isMine = m.from === me._id;
          const read = readBy.has(m._id);
          return (
            <div key={m._id} className={"bubble " + (isMine ? "out" : "in")}>
              {m.text}
              <span className="stamp">
                {time(m.createdAt)}
                {isMine && <span className={"ticks " + (read ? "read" : "")}>✓✓</span>}
              </span>
            </div>
          );
        })}
        {typing && (
          <div className="bubble in typing-indicator">typing...</div>
        )}
        <div ref={bottom} />
      </div>

      <div className="foot">
        <input
          value={text}
          placeholder="Type a message"
          onChange={handleType}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="send" onClick={send}>➤</button>
      </div>
    </>
  );
}
