const express = require('express');
const asanaController = require('../controllers/asanaController');

const router = express.Router();

router.post('/team', asanaController.createTeam);
router.post('/project', asanaController.createProject);
router.post('/task', asanaController.createTask);
router.put('/project/:id', asanaController.updateProject);
router.put('/task/:id', asanaController.updateTask);
router.patch('/task/:id/complete', asanaController.completeTask);
router.patch('/project/:id/archive', asanaController.archiveProject);
router.delete('/task/:id', asanaController.deleteTask);
router.get('/teams', asanaController.listTeams);
router.get('/projects', asanaController.listProjects);
router.get('/tasks', asanaController.listTasks);

module.exports = router;