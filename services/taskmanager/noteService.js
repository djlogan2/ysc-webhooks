import pool from '../db.js';

export const getNotesByTaskId = async (taskId) => {
    const [rows] = await pool.query(
        'SELECT * FROM dj.taskmanager_notes WHERE task_id = ?',
        [taskId]
    );
    return rows;
};

export const createNote = async (task_id, note_text) => {
    const [result] = await pool.query(
        'INSERT INTO dj.taskmanager_notes (task_id, note_text) VALUES (?, ?)',
        [task_id, note_text]
    );
    return { note_id: result.insertId, task_id, note_text };
};

export const updateNote = async (id, note_text) => {
    const [result] = await pool.query(
        'UPDATE dj.taskmanager_notes SET note_text = ?, updated_at = NOW() WHERE note_id = ?',
        [note_text, id]
    );
    return result.affectedRows > 0 ? { note_id: id, note_text } : null;
};

export const deleteNote = async (id) => {
    const [result] = await pool.query(
        'DELETE FROM dj.taskmanager_notes WHERE note_id = ?',
        [id]
    );
    return result.affectedRows > 0;
};
