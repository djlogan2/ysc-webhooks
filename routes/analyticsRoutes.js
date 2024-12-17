import express from 'express';
import {  saveAnalytics, getAnalytics  } from '../controllers/analyticsController.js';

const router = express.Router();

// Route to save analytics data
router.post('/', saveAnalytics);

// Route to query analytics data
router.get('/', getAnalytics);

export default router;
