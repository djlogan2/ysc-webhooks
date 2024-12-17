import db from './db.js';

export const writeDMARCRecord = async (record) => {
    const query = 'INSERT INTO dmarc_records SET ?';
    const [result] = await db.query(query, [record]);
    return result.insertId;
}

export const readAllRecords = async () => {
    const [rows] = await db.query('SELECT * FROM dmarc_records');
    return rows;
}

export const getNeedsAttention  =async () => {
    const [rows] = await db.query('SELECT * FROM dmarc_records WHERE action_required = true');
    return rows;
}

export const markAsHandled = async(id) => {
    const query = 'UPDATE dmarc_records SET action_required = false, resolution_status = "Handled" WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
}