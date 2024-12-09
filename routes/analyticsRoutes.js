const express = require('express');
const { saveAnalytics, getAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

// Route to save analytics data
router.post('/', saveAnalytics);

// Route to query analytics data
router.get('/', getAnalytics);

module.exports = router;
