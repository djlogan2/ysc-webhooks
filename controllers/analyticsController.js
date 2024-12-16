const { saveAnalyticsData, queryAnalyticsData } = require('../services/analyticsService');

async function saveAnalytics(req, res) {
    try {
        const data = req.body;
        data.ipAddress = req.ip; // Capture IP address from the request
        await saveAnalyticsData(data);
        res.status(200).send({ message: 'Analytics data saved successfully' });
    } catch (error) {
        console.error('Error saving analytics data:', error);
        res.status(500).send({ error: 'Failed to save analytics data' });
    }
}

async function getAnalytics(req, res) {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            eventType: req.query.eventType,
            userId: req.query.userId
        };
        const data = await queryAnalyticsData(filters);
        res.status(200).send(data);
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).send({ error: 'Failed to fetch analytics data' });
    }
}

module.exports = { saveAnalytics, getAnalytics };
