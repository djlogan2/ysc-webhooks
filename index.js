const express = require('express');
const emailRoutes = require('./routes/emailRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const asanaRoutes = require('./routes/asanaRoutes');
const dmarcRoutes = require('./routes/dmarcRoutes');
const { runBackgroundDMARC } = require('./background/dmarc');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/email', emailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/asana', asanaRoutes);
app.use('/dmarc', dmarcRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Initialize background tasks
runBackgroundDMARC();