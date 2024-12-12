import pool from '../db.js'; // Import MySQL pool

export const getAllClients = async () => {
    const [rows] = await pool.query('SELECT * FROM dj.taskmanager_clients WHERE archived IS NULL OR archived = 0');
    return rows;
};

export const getClientById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM dj.taskmanager_clients WHERE client_id = ?', [id]);
    return rows[0];
};

export const createClient = async (data) => {
    const { client_name, contact_info } = data;
    const [result] = await pool.query('INSERT INTO dj.taskmanager_clients (client_name, contact_info) VALUES (?, ?)', [client_name, contact_info]);
    return { client_id: result.insertId, client_name, contact_info };
};

export const updateClient = async (id, data) => {
    const { client_name, contact_info } = data;
    const [result] = await pool.query(
        'UPDATE dj.taskmanager_clients SET client_name = ?, contact_info = ?, updated_at = NOW() WHERE client_id = ?',
        [client_name, contact_info, id]
    );
    return result.affectedRows > 0 ? { client_id: id, client_name, contact_info } : null;
};

export const archiveClient = async (id) => {
    const count = await pool.query('SELECT COUNT(*) FROM dj.taskmanager_projects WHERE client_id = ? AND (archived IS NULL OR archived = 0)', [id]);
    if(!!count?.[0]?.[0]?.['COUNT(*)'])
        return false; //throw Error('Cannot archive a client with active projects');
    const [result] = await pool.query('UPDATE dj.taskmanager_clients SET archived = ? WHERE client_id = ? AND (archived IS NULL OR archived = 0)', [1, id]);
    return result.affectedRows > 0;
};

export const deleteClient = async (id) => {
    const [result] = await pool.query('DELETE FROM dj.taskmanager_clients WHERE client_id = ?', [id]);
    return result.affectedRows > 0;
};
