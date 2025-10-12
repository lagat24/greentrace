require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const treeRoutes = require('./routes/trees');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/trees', treeRoutes);
app.use('/leaderboard', leaderboardRoutes);

app.get('/', (req, res) => res.send({ ok: true, app: 'GreenTrace API' }));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));