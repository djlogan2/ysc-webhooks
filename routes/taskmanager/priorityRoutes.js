import express from 'express';
const router = express.Router();
import * as priorityController from '../../controllers/taskmanager/priorityController.js';

router.get('/', priorityController.getAllPriorities);
router.post('/', priorityController.createPriority);
router.put('/:id', priorityController.updatePriority);
router.delete('/:id', priorityController.deletePriority);

export default router;
