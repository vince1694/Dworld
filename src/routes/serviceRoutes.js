const express = require('express');
const { getServices, getMyServices, createService, updateService, deleteService, matchRequestWithAI } = require('../controllers/serviceController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', getServices);
router.post('/ai-match', matchRequestWithAI);
router.get('/my-services', protect, adminOnly, getMyServices);
router.post('/', protect, adminOnly, createService);
router.put('/:id', protect, adminOnly, updateService);
router.delete('/:id', protect, adminOnly, deleteService);

module.exports = router;
