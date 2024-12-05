const db = require('./db');

class DMARCService {
    async writeDMARCRecord(record) {
        const query = 'INSERT INTO dmarc_records SET ?';
        const [result] = await db.query(query, [record]);
        return result.insertId;
    }

    async readAllRecords() {
        const [rows] = await db.query('SELECT * FROM dmarc_records');
        return rows;
    }

    async getNeedsAttention() {
        const [rows] = await db.query('SELECT * FROM dmarc_records WHERE action_required = true');
        return rows;
    }

    async markAsHandled(id) {
        const query = 'UPDATE dmarc_records SET action_required = false, resolution_status = "Handled" WHERE id = ?';
        const [result] = await db.query(query, [id]);
        return result.affectedRows > 0;
    }
}

module.exports = new DMARCService();