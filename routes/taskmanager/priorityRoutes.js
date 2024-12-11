import express from 'express';
const router = express.Router();
import priorityController from '../../controllers/taskmanager/priorityController';

router.get('/', priorityController.getAllPriorities);
router.post('/', priorityController.createPriority);
router.put('/:id', priorityController.updatePriority);
router.delete('/:id', priorityController.deletePriority);

export default router;
