import express from 'express.js';
const router = express.Router();
import contextController from '../../controllers/taskmanager/contextController.js';

router.get('/', contextController.getAllContexts);
router.post('/', contextController.createContext);
router.put('/:id', contextController.updateContext);
router.delete('/:id', contextController.deleteContext);

export default router;
