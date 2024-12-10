const express = require('express');
const emailRoutes = require('./routes/emailRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const dmarcRoutes = require('./routes/dmarcRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const clientRoutes = require('./routes/taskmanager/clientRoutes');
const projectRoutes = require('./routes/taskmanager/projectRoutes');
const contextRoutes = require('./routes/taskmanager/contextRoutes');
const priorityRoutes = require('./routes/taskmanager/priorityRoutes');
const tagRoutes = require('./routes/taskmanager/tagRoutes');
const noteRoutes = require('./routes/taskmanager/noteRoutes');
const taskRoutes = require('./routes/taskmanager/taskRoutes');
// const backgroundRoutes = require('./routes/backgroundRoutes');
const {getAnalyticsScript} = require('./services/getAnalyticsScript');
const { runBackgroundDMARC } = require('./background/dmarc');
const { runBackgroundAssistant } = require('./background/backgroundAssistant');

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
