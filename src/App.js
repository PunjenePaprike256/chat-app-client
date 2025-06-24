import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";

const SERVER_URL = "https://chat-app-serverorg.onrender.com";

const socket = io(SERVER_URL);

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [room, setRoom] = useState("global");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [dmUser, setDmUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const dmMessagesRef = useRef([]);

  useEffect(() => {
    if (isLoggedIn) {
      socket.emit("join_room", { room, username });
    }
  }, [isLoggedIn, room, username]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      if (data.room === room) {
        setMessages((prev) => [...prev, data]);
      }
    });

    socket.on("room_users", (usersInRoom) => {
      setUsers(usersInRoom);
    });

    socket.on("receive_private_message", (data) => {
      // Add DM message if it is from or to current user
      if (
        (dmUser && data.author === dmUser) ||
        (dmUser && data.toUsername === username)
      ) {
        dmMessagesRef.current = [...dmMessagesRef.current, data];
        setDmMessages(dmMessagesRef.current);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("room_users");
      socket.off("receive_private_message");
    };
  }, [room, dmUser, username]);

  const handleRegister = async () => {
    setRegisterError("");
    if (!username || !password) {
      setRegisterError("Unesi username i password");
      return;
    }
    try {
      const res = await axios.post(`${SERVER_URL}/register`, {
        username,
        password,
      });
      alert(res.data.message);
    } catch (error) {
      setRegisterError(
        error.response?.data?.error || "Greška pri registraciji"
      );
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    if (!username || !password) {
      setLoginError("Unesi username i password");
      return;
    }
    try {
      const res = await axios.post(`${SERVER_URL}/login`, { username, password });
      if (res.data.success) {
        setIsLoggedIn(true);
      } else {
        setLoginError("Pogrešan username ili lozinka");
      }
    } catch (error) {
      setLoginError(error.response?.data?.error || "Greška pri loginu");
    }
  };

  const sendMessage = () => {
    if (!message) return;
    const data = {
      room,
      author: username,
      message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, data]);
    socket.emit("send_message", data);
    setMessage("");
  };

  const sendPrivateMessage = (msg) => {
    if (!msg || !dmUser) return;
    const data = {
      fromUsername: username,
      toUsername: dmUser,
      message: msg,
    };
    dmMessagesRef.current = [
      ...dmMessagesRef.current,
      { author: username, message: msg, timestamp: new Date().toISOString() },
    ];
    setDmMessages(dmMessagesRef.current);
    socket.emit("send_private_message", data);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
        <h2>Login / Register</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <button onClick={handleLogin} style={{ marginRight: 10 }}>
          Login
        </button>
        <button onClick={handleRegister}>Register</button>
        {loginError && <p style={{ color: "red" }}>{loginError}</p>}
        {registerError && <p style={{ color: "red" }}>{registerError}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "auto", padding: 20 }}>
      <h2>Dobrodošao, {username}</h2>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Users list */}
        <div
          style={{
            border: "1px solid gray",
            padding: 10,
            width: 150,
            height: 400,
            overflowY: "auto",
          }}
        >
          <h3>Korisnici u sobi</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {users.map((user) => (
              <li
                key={user}
                style={{
                  cursor: "pointer",
                  fontWeight: user === dmUser ? "bold" : "normal",
                }}
                onClick={() => setDmUser(user === dmUser ? null : user)}
              >
                {user} {user === username ? "(Ti)" : ""}
              </li>
            ))}
          </ul>
        </div>

        {/* Main chat or DM */}
        <div
          style={{
            border: "1px solid gray",
            padding: 10,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: 400,
          }}
        >
          {dmUser ? (
            <>
              <h3>DM sa {dmUser}</h3>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  border: "1px solid #ccc",
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                {dmMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      textAlign: msg.author === username ? "right" : "left",
                      marginBottom: 5,
                    }}
                  >
                    <b>{msg.author}: </b> {msg.message}
                  </div>
                ))}
              </div>
              <SendMessageInput
                onSend={(msg) => sendPrivateMessage(msg)}
                placeholder="Pošalji DM poruku..."
              />
              <button onClick={() => setDmUser(null)} style={{ marginTop: 5 }}>
                Zatvori DM
              </button>
            </>
          ) : (
            <>
              <h3>Javni chat - soba: {room}</h3>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  border: "1px solid #ccc",
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      textAlign: msg.author === username ? "right" : "left",
                      marginBottom: 5,
                    }}
                  >
                    <b>{msg.author}: </b> {msg.message}
                  </div>
                ))}
              </div>
              <SendMessageInput
                onSend={(msg) => {
                  setMessage(msg);
                  sendMessage();
                }}
                placeholder="Pošalji poruku..."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SendMessageInput({ onSend, placeholder }) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input
        type="text"
        value={input}
        placeholder={placeholder}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSend();
        }}
        style={{ flex: 1 }}
      />
      <button onClick={handleSend}>Pošalji</button>
    </div>
  );
}

export default App;
