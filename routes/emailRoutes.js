import express from 'express.js';
import emailController from '../controllers/emailController.js';

const router = express.Router();

router.get('/', emailController.readEmails);
router.get('/test', emailController.test);
router.post('/send', emailController.sendEmail);
router.delete('/:id', emailController.deleteEmail);
router.patch('/:id/archive', emailController.archiveEmail);

export default router;