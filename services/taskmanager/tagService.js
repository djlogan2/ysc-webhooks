import pool from '../db';

exports.getAllTags = async () => {
    const [rows] = await pool.query('SELECT * FROM dj.taskmanager_tags');
    return rows;
};

exports.createTag = async (tag_name) => {
    const [result] = await pool.query(
        'INSERT INTO dj.taskmanager_tags (tag_name) VALUES (?)',
        [tag_name]
    );
    return { tag_id: result.insertId, tag_name };
};

exports.updateTag = async (id, tag_name) => {
    const [result] = await pool.query(
        'UPDATE dj.taskmanager_tags SET tag_name = ?, updated_at = NOW() WHERE tag_id = ?',
        [tag_name, id]
    );
    return result.affectedRows > 0 ? { tag_id: id, tag_name } : null;
};

exports.deleteTag = async (id) => {
    const [result] = await pool.query('DELETE FROM dj.taskmanager_tags WHERE tag_id = ?', [id]);
    return result.affectedRows > 0;
};

exports.addTagToTask = async (taskId, tag_id) => {
    const [result] = await pool.query(
        'INSERT INTO dj.taskmanager_task_tags (task_id, tag_id) VALUES (?, ?)',
        [taskId, tag_id]
    );
    return result.affectedRows > 0;
};

exports.removeTagFromTask = async (taskId, tag_id) => {
    const [result] = await pool.query(
        'DELETE FROM dj.taskmanager_task_tags WHERE task_id = ? AND tag_id = ?',
        [taskId, tag_id]
    );
    return result.affectedRows > 0;
};
