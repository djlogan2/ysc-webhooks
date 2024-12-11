import express from 'express';
import emailRoutes from './routes/emailRoutes';
import calendarRoutes from './routes/calendarRoutes';
import dmarcRoutes from './routes/dmarcRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import clientRoutes from './routes/taskmanager/clientRoutes';
import projectRoutes from './routes/taskmanager/projectRoutes';
import contextRoutes from './routes/taskmanager/contextRoutes';
import priorityRoutes from './routes/taskmanager/priorityRoutes';
import tagRoutes from './routes/taskmanager/tagRoutes';
import noteRoutes from './routes/taskmanager/noteRoutes';
import taskRoutes from './routes/taskmanager/taskRoutes';
// import backgroundRoutes from './routes/backgroundRoutes';
import { getAnalyticsScript } from './services/getAnalyticsScript';
import {  runBackgroundDMARC  } from './background/dmarc';
import {  runBackgroundAssistant  } from './background/backgroundAssistant';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/email', emailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/dmarc', dmarcRoutes);
app.use('/api/analytics', analyticsRoutes);

// New routes
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contexts', contextRoutes);
app.use('/api/priorities', priorityRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tasks', taskRoutes);

// Analytics route
app.get('/analytics.js', (req, res) => {
    res.type('application/javascript');
    res.send(getAnalyticsScript());
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Initialize background tasks
runBackgroundDMARC();
runBackgroundAssistant();
