const express = require('express');
const router = express.Router();
const tagController = require('../../controllers/taskmanager/tagController');

router.get('/', tagController.getAllTags);
router.post('/', tagController.createTag);
router.put('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

// Routes for managing task-tag associations
router.post('/tasks/:taskId', tagController.addTagToTask);
router.delete('/tasks/:taskId/:tagId', tagController.removeTagFromTask);

module.exports = router;
