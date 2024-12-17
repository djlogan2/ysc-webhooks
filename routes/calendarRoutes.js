import express from 'express';
import * as calendarController from '../controllers/calendarController.js';

const router = express.Router();

router.get('/', calendarController.readCalendar);
router.post('/', calendarController.createCalendar);
router.delete('/:id', calendarController.deleteCalendar);

export default router;
