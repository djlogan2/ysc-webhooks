const mysql = require('mysql2/promise');
const dbConfig = require('../config/dbConfig');
const config = {
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}
const pool = mysql.createPool(config);

module.exports = pool;