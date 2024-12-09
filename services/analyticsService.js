const db = require('./db'); // Assuming you have a db utility for queries

// Service to save analytics data
async function saveAnalyticsData(data) {
    const query = `
        INSERT INTO analytics 
        (event_type, url, referrer, user_agent, screen_size, language, timestamp, event_category, event_action, event_label, event_value, custom_data) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        data.eventType,
        data.url,
        data.referrer,
        data.userAgent,
        data.screenSize,
        data.language,
        new Date(data.timestamp),
        data.eventCategory || null,
        data.eventAction || null,
        data.eventLabel || null,
        data.eventValue || null,
        JSON.stringify(data.customData || {})
    ];
    await db.execute(query, params);
}

// Service to query analytics data
async function queryAnalyticsData(filters) {
    // Extend this logic for filtering as needed
    const query = `SELECT * FROM analytics`;
    const [rows] = await db.query(query);
    return rows;
}

module.exports = { saveAnalyticsData, queryAnalyticsData };
