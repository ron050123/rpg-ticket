const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Attach io to request for use in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bosses', require('./routes/bosses'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/dungeons', require('./routes/dungeons'));

// Lobby state
const lobbyPlayers = {}; // { socketId: { id, username, x, y, appearance } }

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- LOBBY EVENTS ---
    socket.on('join_lobby', (userData) => {
        // Assign random initial position or fixed spawn point
        const startX = 400 + Math.random() * 100 - 50;
        const startY = 300 + Math.random() * 100 - 50;

        lobbyPlayers[socket.id] = {
            id: userData.id,
            username: userData.username,
            appearance: userData.appearance,
            x: startX,
            y: startY
        };

        // Tell the user who is currently here
        socket.emit('current_players', lobbyPlayers);

        // Tell others a new player joined
        socket.broadcast.emit('player_joined', { socketId: socket.id, player: lobbyPlayers[socket.id] });
        console.log(`${userData.username} joined the lobby at ${startX}, ${startY}`);
    });

    socket.on('player_move', (positionData) => {
        if (lobbyPlayers[socket.id]) {
            lobbyPlayers[socket.id].x = positionData.x;
            lobbyPlayers[socket.id].y = positionData.y;
            // Broadcast to everyone else
            socket.broadcast.emit('player_moved', { socketId: socket.id, x: positionData.x, y: positionData.y });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (lobbyPlayers[socket.id]) {
            socket.broadcast.emit('player_left', socket.id);
            delete lobbyPlayers[socket.id];
        }
    });
});

const PORT = 5322;

async function startServer() {
    try {
        try {
            await sequelize.sync({ alter: true });
            console.log('Database synced successfully (alter: true).');
        } catch (syncErr) {
            console.warn('Sync with alter:true failed, attempting regular sync. Error:', syncErr.message);
            await sequelize.sync();
            console.log('Database synced successfully (basic sync).');
        }

        // Manual migration: ensure Comments.type column exists
        try {
            await sequelize.query("ALTER TABLE Comments ADD COLUMN type TEXT DEFAULT 'COMMENT'");
            console.log('Added missing type column to Comments.');
        } catch (e) {
            // Column already exists, ignore
        }
        // Manual migration: ensure Bosses.tier column exists
        try {
            await sequelize.query("ALTER TABLE Bosses ADD COLUMN tier TEXT DEFAULT 'Boss'");
            console.log('Added missing tier column to Bosses.');
        } catch (e) {
            // Column already exists, ignore
        }
        if (process.env.NODE_ENV !== 'test') {
            try {
                const seedRewards = require('./seeders/rewards');
                await seedRewards();
            } catch (seedErr) {
                console.error('Seeding error:', seedErr);
            }
        }
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Unable to connect to the database:', err);
    }
}

startServer();
