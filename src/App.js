import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import { Picker } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css";
import ReactMarkdown from "react-markdown";

const socket = io("https://chat-app-serverorg.onrender.com");

const App = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [room, setRoom] = useState("general");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [toUser, setToUser] = useState("");
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    socket.emit("join_room", { room, username });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("receive_private_message", ({ author, message, timestamp }) => {
      setPrivateMessages((prev) => ({
        ...prev,
        [author]: [...(prev[author] || []), { author, message, timestamp }],
      }));
    });

    socket.on("room_users", (users) => {
      setUsersInRoom(users);
    });

    return () => {
      socket.off("receive_message");
      socket.off("receive_private_message");
      socket.off("room_users");
    };
  }, [room, isLoggedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRegister = async () => {
    try {
      const res = await axios.post("https://chat-app-serverorg.onrender.com/register", {
        username,
        password,
      });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || "Greška");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post("https://chat-app-serverorg.onrender.com/login", {
        username,
        password,
      });
      alert(res.data.message);
      setIsLoggedIn(true);
    } catch (err) {
      alert(err.response?.data?.error || "Greška");
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    if (toUser) {
      socket.emit("send_private_message", {
        fromUsername: username,
        toUsername: toUser,
        message,
      });
      setPrivateMessages((prev) => ({
        ...prev,
        [toUser]: [...(prev[toUser] || []), { author: username, message }],
      }));
    } else {
      const msgData = {
        room,
        author: username,
        message,
        timestamp: new Date().toISOString(),
      };
      socket.emit("send_message", msgData);
      setMessages((prev) => [...prev, msgData]);
    }
    setMessage("");
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji.native);
  };

  const handleRoomChange = (newRoom) => {
    setRoom(newRoom);
    setMessages([]);
    setToUser("");
  };

  const renderChat = () => {
    const chatToRender = toUser ? privateMessages[toUser] || [] : messages;

    return (
      <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ccc", padding: "10px", background: "#fff" }}>
        {chatToRender.map((msg, index) => (
          <div key={index}>
            <strong style={{ color: msg.author === username ? "green" : "black" }}>{msg.author}:</strong>{" "}
            <ReactMarkdown>{msg.message}</ReactMarkdown>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Prijava / Registracija</h2>
        <input placeholder="Korisničko ime" value={username} onChange={(e) => setUsername(e.target.value)} /><br />
        <input placeholder="Šifra" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><br />
        <button onClick={handleRegister}>Registruj se</button>
        <button onClick={handleLogin}>Prijavi se</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dobrodošao, {username}</h2>

      <div>
        <strong>Izaberi sobu:</strong>
        {["general", "programiranje", "igre", "filmovi"].map((r) => (
          <button key={r} onClick={() => handleRoomChange(r)} disabled={room === r}>
            {r}
          </button>
        ))}
      </div>

      <div>
        <strong>Korisnici u sobi:</strong>
        <ul>
          {usersInRoom.map((user) => (
            <li
              key={user}
              style={{
                fontWeight: user === username ? "bold" : "normal",
                cursor: user !== username ? "pointer" : "default",
              }}
              onClick={() => user !== username && setToUser(user)}
            >
              {user} {user === username && "(ti)"}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <strong>{toUser ? `Privatni razgovor sa ${toUser}` : `Soba: ${room}`}</strong>
        <button onClick={() => setToUser("")} disabled={!toUser}>Vrati se u sobu</button>
      </div>

      {renderChat()}

      <div>
        <textarea
          rows="3"
          style={{ width: "100%", marginTop: "10px" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Unesi poruku..."
        />
        <button onClick={() => setShowEmojiPicker((prev) => !prev)}>😀</button>
        <button onClick={sendMessage}>Pošalji</button>
        {showEmojiPicker && (
          <div style={{ position: "absolute", zIndex: 999 }}>
            <Picker onSelect={handleEmojiSelect} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
