const express = require('express');
const dmarcController = require('../controllers/dmarcController');

const router = express.Router();

router.post('/write', dmarcController.writeDMARCRecord);
router.get('/readall', dmarcController.readAllRecords);
router.get('/needsattention', dmarcController.getNeedsAttention);
router.put('/handled/:id', dmarcController.markAsHandled);

module.exports = router;