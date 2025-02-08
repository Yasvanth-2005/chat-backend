import express from 'express';
import bodyParser from 'body-parser';
import userRoutes from './routes/userRoutes';
import messageRoutes from './routes/messageRoutes';
import teamRoutes from './routes/teamRoutes';

const app = express();

app.use(bodyParser.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/teams', teamRoutes);

export default app;
