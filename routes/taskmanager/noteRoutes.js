import express from 'express';
const router = express.Router();
import noteController from '../../controllers/taskmanager/noteController';

router.get('/task/:taskId', noteController.getNotesByTaskId);
router.post('/', noteController.createNote);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

export default router;