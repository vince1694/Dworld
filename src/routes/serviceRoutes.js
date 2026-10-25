const express = require('express');
const { getServices, getMyServices, createService, updateService, deleteService, matchRequestWithAI } = require('../controllers/serviceController');
const { protect, expertOrAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', getServices);
router.post('/ai-match', matchRequestWithAI);
router.get('/my-services', protect, expertOrAdmin, getMyServices);
router.post('/', protect, expertOrAdmin, createService);
router.put('/:id', protect, expertOrAdmin, updateService);
router.delete('/:id', protect, expertOrAdmin, deleteService);

module.exports = router;
