import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { Picker } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css"; // Ako koristiš emoji-mart@3, ili obriši za v4

const socket = io("http://localhost:3001");

function Avatar({ username }) {
  const initials = username
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold select-none">
      {initials}
    </div>
  );
}

function ChatApp() {
  // --- AUTH ---
  const [isRegistered, setIsRegistered] = useState(true); // da li je user u login ili register modu
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [room, setRoom] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- CHAT ---
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [messageInput, setMessageInput] = useState("");
  const [dmInput, setDmInput] = useState("");
  const [dmRecipient, setDmRecipient] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const roomMessagesEndRef = useRef(null);

  // --- SOCKET EVENTS ---
  useEffect(() => {
    if (!isLoggedIn) return;

    socket.emit("join_room", { room, username });

    socket.on("room_users", (usersList) => {
      setUsers(usersList);
      if (dmRecipient && !usersList.includes(dmRecipient)) {
        setDmRecipient(null);
      }
    });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("receive_private_message", (data) => {
      setPrivateMessages((prev) => {
        const from = data.author;
        const msgs = prev[from] || [];
        return { ...prev, [from]: [...msgs, data] };
      });
    });

    return () => {
      socket.off("room_users");
      socket.off("receive_message");
      socket.off("receive_private_message");
    };
  }, [isLoggedIn, room, username, dmRecipient]);

  useEffect(() => {
    roomMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- FUNCTIONS ---

  // Za registraciju i login (ovde samo dummy, treba API)
  const handleRegister = () => {
    if (!username.trim() || !password.trim()) {
      alert("Unesi username i password");
      return;
    }
    // Ovde možeš dodati poziv backend API-ja za register
    alert(`Registrovan korisnik: ${username}`);
    setIsRegistered(true);
  };

  const handleLogin = () => {
    if (!username.trim() || !password.trim() || !room.trim()) {
      alert("Unesi username, password i sobu");
      return;
    }
    // Ovde možeš dodati poziv backend API-ja za login
    setIsLoggedIn(true);
  };

  const sendMessage = () => {
    if (messageInput.trim() === "") return;
    const msg = {
      room,
      author: username,
      message: messageInput,
      timestamp: new Date().toISOString(),
    };
    socket.emit("send_message", msg);
    setMessages((prev) => [...prev, msg]);
    setMessageInput("");
    setShowEmojiPicker(false);
  };

  const sendPrivateMessage = () => {
    if (!dmRecipient || dmInput.trim() === "") return;
    const msg = {
      toUsername: dmRecipient,
      fromUsername: username,
      message: dmInput,
      timestamp: new Date().toISOString(),
    };
    socket.emit("send_private_message", msg);

    setPrivateMessages((prev) => {
      const msgs = prev[dmRecipient] || [];
      return {
        ...prev,
        [dmRecipient]: [...msgs, msg],
      };
    });

    setDmInput("");
  };

  const addEmoji = (emoji) => {
    setMessageInput((prev) => prev + emoji.native);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            {isRegistered ? "Prijava" : "Registracija"}
          </h2>
          <input
            type="text"
            placeholder="Korisničko ime"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 mb-4 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Lozinka"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isRegistered && (
            <input
              type="text"
              placeholder="Naziv sobe"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full p-3 mb-6 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <button
            onClick={isRegistered ? handleLogin : handleRegister}
            className="w-full bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-3 rounded shadow mb-4"
          >
            {isRegistered ? "Prijavi se" : "Registruj se"}
          </button>

          <button
            onClick={() => setIsRegistered(!isRegistered)}
            className="w-full text-center text-blue-400 underline"
          >
            {isRegistered
              ? "Nemate nalog? Registruj se"
              : "Već imate nalog? Prijavi se"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-800 flex text-gray-300 relative">
      <aside className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center space-x-3">
          <div className="text-blue-500 font-bold text-lg">Soba:</div>
          <div className="font-semibold">{room}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <h3 className="text-sm font-semibold uppercase mb-2 px-2 text-gray-500">
            Korisnici
          </h3>
          <ul>
            {users
              .filter((u) => u !== username)
              .map((u) => (
                <li
                  key={u}
                  onClick={() => setDmRecipient(u)}
                  className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded-md mb-1 hover:bg-blue-700 ${
                    u === dmRecipient ? "bg-blue-600 font-semibold text-white" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar username={u} />
                    <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></span>
                  </div>
                  {u}
                </li>
              ))}
          </ul>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <section className="flex flex-col flex-1 bg-gray-700 p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 px-2" ref={roomMessagesEndRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-2 max-w-xl p-3 rounded-lg ${
                  m.author === username ? "bg-blue-600 self-end" : "bg-gray-600"
                }`}
              >
                <div className="font-semibold">{m.author}</div>
                <div>{m.message}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-2xl px-2"
              type="button"
              aria-label="Toggle emoji picker"
            >
              😊
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-14 right-0 z-50">
                <Picker onSelect={addEmoji} theme="dark" />
              </div>
            )}

            <input
              type="text"
              placeholder="Napiši poruku u sobi..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              className="flex-1 rounded px-4 py-2 text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 hover:bg-blue-700 rounded px-6 font-semibold"
            >
              Pošalji
            </button>
          </div>
        </section>

        <section className="bg-gray-900 p-4 border-t border-gray-700">
          <h4 className="font-semibold mb-3 text-white">
            Privatni chat {dmRecipient ? `(sa ${dmRecipient})` : "(izaberi korisnika)"}
          </h4>
          <div
            className="max-h-48 overflow-y-auto bg-gray-800 rounded p-3 mb-3 space-y-2"
            style={{ minHeight: "120px" }}
          >
            {dmRecipient ? (
              (privateMessages[dmRecipient] || []).map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded ${
                    m.author === username ? "bg-blue-600 self-end" : "bg-gray-700"
                  }`}
                >
                  <div className="font-semibold">{m.author}</div>
                  <div>{m.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">Izaberi korisnika sa leve liste za privatni chat.</p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Pošalji privatnu poruku..."
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendPrivateMessage();
              }}
              disabled={!dmRecipient}
              className="flex-1 rounded px-4 py-2 text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600"
            />
            <button
              onClick={sendPrivateMessage}
              disabled={!dmRecipient}
              className="bg-blue-600 hover:bg-blue-700 rounded px-6 font-semibold disabled:opacity-50"
            >
              Pošalji DM
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ChatApp;
