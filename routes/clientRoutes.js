const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

// Define routes
router.get('/', clientController.getAllClients);
router.get('/:id', clientController.getClientById);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.archiveClient);
router.delete('/hard/:id', clientController.deleteClient);

module.exports = router;
