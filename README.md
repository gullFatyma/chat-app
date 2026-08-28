# 💬 Real-Time Chat Application

A modern **real-time chat application** built with the **MERN stack**, featuring user authentication, persistent messaging, and real-time communication using **Socket.IO**.

The project demonstrates how a full-stack chat system works — from **user registration and login** to **sending and receiving messages in real time**.

---



## ✨ Features

* 🔐 **User Registration & Login**
* 🔑 **Authentication with JWT**
* 🍪 **Secure Cookie-Based Authentication**
* 💬 **Real-Time Messaging**
* ⚡ **Socket.IO Integration**
* 💾 **Persistent Messages using MongoDB**
* 👤 **User-based Conversations**
* 📡 **REST API for Chat Operations**
* 🎨 **Responsive Chat Interface**
* 🧩 **Modular Backend Architecture**

---

## 🛠️ Tech Stack

### Frontend

* ⚛️ React
* ⚡ Vite
* 🎨 CSS
* 🔌 Socket.IO Client
* 🌐 Fetch API

### Backend

* 🟢 Node.js
* 🚂 Express.js
* 🍃 MongoDB
* 📦 Mongoose
* 🔌 Socket.IO

### Authentication

* 🔐 JSON Web Token (JWT)
* 🍪 HTTP Cookies

### Development Tools

* Git & GitHub
* VS Code
* Postman

---

## 🔄 How It Works

The application follows a simple full-stack communication flow:

```text
User
  │
  ▼
React Frontend
  │
  ├── Login / Register
  │
  ▼
Express API
  │
  ├── Authentication
  ├── Chat Routes
  │
  ▼
MongoDB
  │
  └── Messages
       
React Client
  │
  ▼
Socket.IO
  │
  ▼
Real-Time Message
  │
  ▼
Other Connected User
```

### 💬 Message Flow

1. User logs into the application.
2. The frontend establishes a Socket.IO connection.
3. User sends a message.
4. The message is sent to the backend.
5. The server processes and stores the message.
6. Socket.IO broadcasts the message to the relevant connected user.
7. The receiver sees the message instantly without refreshing the page.

---

## 🔐 Authentication Flow

```text
Register
   ↓
Create User
   ↓
Login
   ↓
Verify Credentials
   ↓
Generate JWT
   ↓
Store Token in Cookie
   ↓
Authenticated Requests
```

Authentication ensures that protected chat functionality is available only to logged-in users.

---

## ⚡ Real-Time Communication

The application uses **Socket.IO** to provide real-time communication.

Unlike traditional HTTP requests where the client repeatedly asks the server for updates, Socket.IO maintains a persistent connection between the client and server.

```text
Client A
   │
   │  Message
   ▼
Socket.IO Server
   │
   │  Real-Time Event
   ▼
Client B
```

This allows messages to appear immediately for connected users.

---

## 🗄️ Message Model

Messages are stored in MongoDB so that conversations are not lost when the application is refreshed or restarted.

A message contains information such as:

* Sender
* Receiver
* Message content
* Timestamp

This provides persistent chat history alongside real-time communication.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd chat-app-starter
```

### 2. Install Dependencies

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server` directory.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 4. Start the Backend

```bash
cd server
npm run dev
```

### 5. Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

The application will then be available through the Vite development server.

---


## 👩‍💻 Author

**Gull Fatima**

Computer Science Student | Full-Stack & Mobile Development Enthusiast

---

