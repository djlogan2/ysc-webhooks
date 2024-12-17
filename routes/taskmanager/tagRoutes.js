import express from 'express';
const router = express.Router();
import * as tagController from '../../controllers/taskmanager/tagController.js';

router.get('/', tagController.getAllTags);
router.post('/', tagController.createTag);
router.put('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

// Routes for managing task-tag associations
router.post('/tasks/:taskId', tagController.addTagToTask);
router.delete('/tasks/:taskId/:tagId', tagController.removeTagFromTask);

export default router;
