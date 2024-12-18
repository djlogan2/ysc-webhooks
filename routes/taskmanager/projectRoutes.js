import express from 'express';
const router = express.Router();
import * as projectController from '../../controllers/taskmanager/projectController.js';

router.post('/', projectController.createProject);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router;
