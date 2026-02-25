
# RPG Ticket

A gamified task management system that turns your project tickets into an RPG adventure! Complete quests to deal damage to bosses, level up your heroes, and earn rewards.

## 🎮 Features

### Core
- **Quest Board** — Create, assign, and track tasks as RPG quests with priorities, labels, and deadlines
- **Boss Battles** — Summon bosses whose HP is the sum of all quest damage. Complete quests to deal damage and defeat them
- **Class System** — Warriors (1.5× damage on HIGH priority), Rogues (2× on BUG fixes), Clerics (1.2× XP)
- **XP & Leveling** — Earn XP from completing side quests and level up your character
- **Rewards Shop** — Exchange XP for rewards created by the Grandmaster

### Quest Workflow
- **Lead Assignee + Associates** — Each quest has a lead assignee and optional associates
- **Side Quests** — Lead assignees can create sub-tasks under main quests
- **Approval Flow** — Lead assignees submit proof of work → quest moves to Pending Review → Grandmaster approves or denies with feedback
- **Admin Fast-Track** — Grandmaster can mark quests done directly with optional feedback (skips review)
- **Reopen & Resubmit** — Denied quests return to In Progress; reopened completed quests restore boss HP

### Real-Time
- **WebSocket Updates** — All task, boss, and reward changes sync instantly via Socket.io
- **Notification Bell** — 🔔 Real-time notification dropdown with unread badge for:
  - Quest status changes (In Progress, Pending Review, Completed)
  - New quest assignments
  - Quest denials with reasons
  - Reward exchanges (GM only)
  - Friends joining quests
- **Victory Popup** — Celebration screen when all quests for a boss are completed, showing contributing heroes

### Activity & Comments
- **Activity Tab** — Full timeline of proof of work submissions, approvals, denials, and regular comments on each quest
- **Typed Comments** — Comments are categorized (Comment, Proof of Work, Approval, Denial) for a rich activity feed

### UI
- **Retro 8-bit Interface** — NES.css styled UI with pixel-art aesthetics
- **Boss Arena** — Animated boss display with HP bar and defeat animation
- **Battle View & Timeline View** — Two perspectives for managing quests
- **Responsive Columns** — To Do, In Progress, and Completed columns adapt to screen size

## 🛠️ Tech Stack

### Client
- **Framework**: React (Vite)
- **Styling**: NES.css (Retro 8-bit style)
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
- Node.js (v18+)

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
   node index.js
   ```
   Server runs on `http://localhost:5322`.

3. **Setup Client**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   Client runs on `http://localhost:5173`.

## ⚔️ Usage

### As Grandmaster (Admin)
1. Register with the **Grandmaster** class
2. **Summon a Boss** to create a project milestone
3. **Create Quests** and assign a lead + associates
4. **Review submissions** — approve or deny with feedback
5. **Manage rewards** in the Rewards shop
6. Monitor all activity via the 🔔 notification bell

### As Hero (Team Member)
1. Register and choose a class (Warrior, Rogue, Cleric, etc.)
2. **Start quests** assigned to you
3. **Create side quests** under quests you lead
4. **Submit proof of work** when done — await GM approval
5. **Earn XP** and exchange it for rewards
6. Help defeat the boss by completing all quests!

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[ISC](https://opensource.org/licenses/ISC)
