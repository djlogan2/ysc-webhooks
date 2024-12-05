const express = require('express');
const emailController = require('../controllers/emailController');

const router = express.Router();

router.get('/', emailController.readEmails);
router.get('/test', emailController.test);
router.post('/send', emailController.sendEmail);
router.delete('/:id', emailController.deleteEmail);
router.patch('/:id/archive', emailController.archiveEmail);

module.exports = router;