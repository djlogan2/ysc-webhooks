import db from './db'; // Assuming you have a db utility for queries

// Service to save analytics data
async function saveAnalyticsData(data) {
    console.log('Saving data to database:', data); // Debug log

    const query = `
        INSERT INTO analytics 
        (event_type, url, referrer, user_agent, screen_size, language, timestamp, event_category, event_action, event_label, event_value, custom_data) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        data.eventType || null,         // Replace undefined with null
        data.url || null,
        data.referrer || null,
        data.userAgent || null,
        data.screenSize || null,
        data.language || null,
        data.timestamp ? new Date(data.timestamp) : null,
        data.eventCategory || null,
        data.eventAction || null,
        data.eventLabel || null,
        data.eventValue || null,
        JSON.stringify(data.customData || {}) // Always ensure customData is valid JSON
    ];

    try {
        await db.execute(query, params);
    } catch (error) {
        console.error('Database error:', error); // Log database errors
        throw error; // Propagate the error
    }
}

// Service to query analytics data
async function queryAnalyticsData(filters) {
    // Extend this logic for filtering as needed
    const query = `SELECT * FROM analytics`;
    const [rows] = await db.query(query);
    return rows;
}

module.exports = { saveAnalyticsData, queryAnalyticsData };
