import db from './db.js';

export const saveAnalyticsData = async (data) => {
    const query = `
    INSERT INTO analytics
    (event_type, url, referrer, user_agent, screen_size, language, timestamp, 
    event_category, event_action, event_label, event_value, custom_data,
    user_id, session_id, ip_address, load_time, dom_interactive, 
    dom_content_loaded, first_paint, color_depth, pixel_ratio, touch_points, platform)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        data.eventType || null,
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
        JSON.stringify(data.customData || {}),
        data.userId || null,
        data.sessionId || null,
        data.ipAddress || null,
        data.loadTime || null,
        data.domInteractive || null,
        data.domContentLoaded || null,
        data.firstPaint || null,
        data.colorDepth || null,
        data.pixelRatio || null,
        data.touchPoints || null,
        data.platform || null
    ];

    try {
        await db.execute(query, params);
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

export const queryAnalyticsData = async (filters) => {
    let query = `SELECT * FROM analytics`;
    const params = [];

    if (filters.startDate) {
        query += ` AND timestamp >= ?`;
        params.push(new Date(filters.startDate));
    }
    if (filters.endDate) {
        query += ` AND timestamp <= ?`;
        params.push(new Date(filters.endDate));
    }
    if (filters.eventType) {
        query += ` AND event_type = ?`;
        params.push(filters.eventType);
    }
    if (filters.userId) {
        query += ` AND user_id = ?`;
        params.push(filters.userId);
    }

    const [rows] = await db.query(query, params);
    return rows;
}

