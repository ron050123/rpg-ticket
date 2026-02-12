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

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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
            // Verify if it's the specific backup error which usually means schema is actually fine or data migration failed
            // We'll try basic sync which doesn't alter schema but ensures tables exist
            await sequelize.sync();
            console.log('Database synced successfully (basic sync).');
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
