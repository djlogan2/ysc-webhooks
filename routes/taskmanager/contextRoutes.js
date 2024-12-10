const express = require('express');
const router = express.Router();
const contextController = require('../../controllers/taskmanager/contextController');

router.get('/', contextController.getAllContexts);
router.post('/', contextController.createContext);
router.put('/:id', contextController.updateContext);
router.delete('/:id', contextController.deleteContext);

module.exports = router;
