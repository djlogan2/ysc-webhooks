const express = require('express');
const calendarController = require('../controllers/calendarController');

const router = express.Router();

router.get('/', calendarController.readCalendar);
router.post('/', calendarController.createCalendar);
router.delete('/:id', calendarController.deleteCalendar);

module.exports = router;