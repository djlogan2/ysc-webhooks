import express from 'express.js';
const router = express.Router();
import taskController from '../../controllers/taskmanager/taskController.js';

// Define routes
router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.archiveTask);
router.post('/:id/complete', taskController.completeTask);

export default router;
