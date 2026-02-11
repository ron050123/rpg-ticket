const jwt = require('jsonwebtoken');
const { User } = require('../models');

const SECRET_KEY = process.env.JWT_SECRET || 'secret_quest_key';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) return res.sendStatus(403);

        try {
            const user = await User.findByPk(decoded.id);
            if (!user) return res.sendStatus(403);
            req.user = user;
            next();
        } catch (e) {
            return res.sendStatus(500);
        }
    });
};

const requireAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'ADMIN') {
            next();
        } else {
            res.status(403).json({ message: 'Only the Grandmaster can perform this action.' });
        }
    });
};

module.exports = { verifyToken, requireAdmin };
