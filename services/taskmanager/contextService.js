const pool = require('../db');

exports.getAllContexts = async () => {
    const [rows] = await pool.query('SELECT * FROM dj.taskmanager_contexts');
    return rows;
};

exports.createContext = async (context_name) => {
    const [result] = await pool.query(
        'INSERT INTO dj.taskmanager_contexts (context_name) VALUES (?)',
        [context_name]
    );
    return { context_id: result.insertId, context_name };
};

exports.updateContext = async (id, context_name) => {
    const [result] = await pool.query(
        'UPDATE dj.taskmanager_contexts SET context_name = ?, updated_at = NOW() WHERE context_id = ?',
        [context_name, id]
    );
    return result.affectedRows > 0 ? { context_id: id, context_name } : null;
};

exports.deleteContext = async (id) => {
    const [result] = await pool.query('DELETE FROM dj.taskmanager_contexts WHERE context_id = ?', [id]);
    return result.affectedRows > 0;
};
