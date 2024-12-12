import mysql from 'mysql2/promise.js';
import dbConfig from '../config/dbConfig.js';
const config = {
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}
const pool = mysql.createPool(config);

export default pool;