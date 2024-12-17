import express from 'express';
const router = express.Router();
import clientController from '../../controllers/taskmanager/clientController.js';

// Define routes
router.get('/', clientController.getAllClients);
router.get('/:id', clientController.getClientById);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.archiveClient);
router.delete('/hard/:id', clientController.deleteClient);

export default router;
