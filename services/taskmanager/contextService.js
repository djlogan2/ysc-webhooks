import pool from '../db.js';

export const getAllContexts = async () => {
    const [rows] = await pool.query('SELECT * FROM dj.taskmanager_contexts');
    return rows;
};

export const createContext = async (context_name) => {
    const [result] = await pool.query(
        'INSERT INTO dj.taskmanager_contexts (context_name) VALUES (?)',
        [context_name]
    );
    return { context_id: result.insertId, context_name };
};

export const updateContext = async (id, context_name) => {
    const [result] = await pool.query(
        'UPDATE dj.taskmanager_contexts SET context_name = ?, updated_at = NOW() WHERE context_id = ?',
        [context_name, id]
    );
    return result.affectedRows > 0 ? { context_id: id, context_name } : null;
};

export const deleteContext = async (id) => {
    const [result] = await pool.query('DELETE FROM dj.taskmanager_contexts WHERE context_id = ?', [id]);
    return result.affectedRows > 0;
};
