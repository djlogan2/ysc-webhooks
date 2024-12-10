const express = require('express');
const router = express.Router();
const noteController = require('../../controllers/taskmanager/noteController');

router.get('/task/:taskId', noteController.getNotesByTaskId);
router.post('/', noteController.createNote);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
