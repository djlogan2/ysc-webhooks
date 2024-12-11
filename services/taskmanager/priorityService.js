import pool from '../db';

exports.getAllPriorities = async () => {
    const [rows] = await pool.query('SELECT * FROM dj.taskmanager_priorities');
    return rows;
};

exports.createPriority = async (priority_name) => {
    const [result] = await pool.query(
        'INSERT INTO dj.taskmanager_priorities (priority_name) VALUES (?)',
        [priority_name]
    );
    return { priority_id: result.insertId, priority_name };
};

exports.updatePriority = async (id, priority_name) => {
    const [result] = await pool.query(
        'UPDATE dj.taskmanager_priorities SET priority_name = ?, updated_at = NOW() WHERE priority_id = ?',
        [priority_name, id]
    );
    return result.affectedRows > 0 ? { priority_id: id, priority_name } : null;
};

exports.deletePriority = async (id) => {
    const [result] = await pool.query('DELETE FROM dj.taskmanager_priorities WHERE priority_id = ?', [id]);
    return result.affectedRows > 0;
};
