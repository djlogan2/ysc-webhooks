import express from 'express';
const router = express.Router();
import contextController from '../../controllers/taskmanager/contextController';

router.get('/', contextController.getAllContexts);
router.post('/', contextController.createContext);
router.put('/:id', contextController.updateContext);
router.delete('/:id', contextController.deleteContext);

export default router;
