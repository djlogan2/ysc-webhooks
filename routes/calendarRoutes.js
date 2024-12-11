import express from 'express';
import calendarController from '../controllers/calendarController';

const router = express.Router();

router.get('/', calendarController.readCalendar);
router.post('/', calendarController.createCalendar);
router.delete('/:id', calendarController.deleteCalendar);

export default router;