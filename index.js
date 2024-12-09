const express = require('express');
const emailRoutes = require('./routes/emailRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const asanaRoutes = require('./routes/asanaRoutes');
const dmarcRoutes = require('./routes/dmarcRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const {getAnalyticsScript} = require('./services/getAnalyticsScript');
const { runBackgroundDMARC } = require('./background/dmarc');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/email', emailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/asana', asanaRoutes);
app.use('/dmarc', dmarcRoutes);
app.use('/api/analytics', analyticsRoutes);

// Analytics route
app.get('/analytics.js', (req, res) => {
    res.type('application/javascript');
    res.send(getAnalyticsScript());
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Initialize background tasks
runBackgroundDMARC();