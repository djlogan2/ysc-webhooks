import express from 'express.js';
import dmarcController from '../controllers/dmarcController.js';

const router = express.Router();

router.post('/write', dmarcController.writeDMARCRecord);
router.get('/readall', dmarcController.readAllRecords);
router.get('/needsattention', dmarcController.getNeedsAttention);
router.put('/handled/:id', dmarcController.markAsHandled);

export default router;