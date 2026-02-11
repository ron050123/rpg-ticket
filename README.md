
# RPG Ticket

A gamified task management system that turns your daily to-dos into an RPG adventure! Complete tasks to deal damage to bosses, level up, and earn rewards.

## 🎮 Features

- **Gamified Task Management**: Create, update, and complete tasks.
- **Boss Battles**: Summon bosses and defeat them by completing your tasks.
- **Real-time Updates**: Socket.io integration for instant status updates.
- **Retro UI**: 8-bit style interface using `nes.css`.
- **Authentication**: Secure user login and registration.
- **Comments**: Discuss tasks with your team (or party members!).

## 🛠️ Tech Stack

### Client
- **Framework**: React (Vite)
- **Styling**: nes.css (Retro 8-bit style)
- **Routing**: React Router
- **Real-time**: Socket.io Client

### Server
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via Sequelize ORM)
- **Real-time**: Socket.io
- **Auth**: JWT & bcrypt

## 🚀 Getting Started

### Prerequisites
- Node.js installed

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ron050123/rpg-ticket.git
   cd rpg-ticket
   ```

2. **Setup Server**
   ```bash
   cd server
   npm install
   # Create a .env file if needed (see config)
   node index.js
   ```
   Server runs on `http://localhost:5000` (default).

3. **Setup Client**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   Client runs on `http://localhost:5173` (default).

## ⚔️ Usage

1. Register a new account.
2. Create tasks on the quest board.
3. Complete tasks to deal damage to the active boss.
4. Summon new bosses when the current one is defeated!

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[ISC](https://opensource.org/licenses/ISC)
