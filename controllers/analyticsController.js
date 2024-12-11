import {  saveAnalyticsData, queryAnalyticsData  } from '../services/analyticsService';

// Controller to save analytics data
async function saveAnalytics(req, res) {
    try {
        const data = req.body;
        await saveAnalyticsData(data);
        res.status(200).send({ message: 'Analytics data saved successfully' });
    } catch (error) {
        console.error('Error saving analytics data:', error);
        res.status(500).send({ error: 'Failed to save analytics data' });
    }
}

// Controller to query analytics data
async function getAnalytics(req, res) {
    try {
        const { filters } = req.query; // Extend this as needed for future use
        const data = await queryAnalyticsData(filters);
        res.status(200).send(data);
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).send({ error: 'Failed to fetch analytics data' });
    }
}

module.exports = { saveAnalytics, getAnalytics };
