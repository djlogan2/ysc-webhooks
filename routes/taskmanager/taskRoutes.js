const express = require('express');
const router = express.Router();
const taskController = require('../../controllers/taskmanager/taskController');

// Define routes
router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.archiveTask);
router.post('/:id/complete', taskController.completeTask);

module.exports = router;
