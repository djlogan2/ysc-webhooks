import * as dmarcService from "../services/dmarcService.js";

class DMARCController {
    async writeDMARCRecord(req, res) {
        try {
            const id = await dmarcService.writeDMARCRecord(req.body);
            res.status(201).json({ id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async readAllRecords(req, res) {
        try {
            const records = await dmarcService.readAllRecords();
            res.json(records);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getNeedsAttention(req, res) {
        try {
            const records = await dmarcService.getNeedsAttention();
            res.json(records);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async markAsHandled(req, res) {
        try {
            const success = await dmarcService.markAsHandled(req.params.id);
            if (success) {
                res.json({ message: 'Record marked as handled' });
            } else {
                res.status(404).json({ error: 'Record not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default new DMARCController();