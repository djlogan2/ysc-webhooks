import express from 'express';
import emailRoutes from './routes/emailRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import dmarcRoutes from './routes/dmarcRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import clientRoutes from './routes/taskmanager/clientRoutes.js';
import projectRoutes from './routes/taskmanager/projectRoutes.js';
import contextRoutes from './routes/taskmanager/contextRoutes.js';
import priorityRoutes from './routes/taskmanager/priorityRoutes.js';
import tagRoutes from './routes/taskmanager/tagRoutes.js';
import noteRoutes from './routes/taskmanager/noteRoutes.js';
import taskRoutes from './routes/taskmanager/taskRoutes.js';
// import backgroundRoutes from './routes/backgroundRoutes.js';
import { getAnalyticsScript } from './services/getAnalyticsScript.js';
import {  runBackgroundDMARC  } from './background/dmarc.js';
import {  runBackgroundAssistant  } from './background/backgroundAssistant.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.set('trust proxy', true);

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
