const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { uploadProfile } = require('../config/multer');

const router = express.Router();

/**
 * Multer wrapper — returns JSON errors instead of HTML
 */
function profileUpload(req, res, next) {
  uploadProfile(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
}

router.put('/update-profile', authenticateToken, profileUpload, userController.updateProfile);
router.get('/me', authenticateToken, userController.getMe);

module.exports = router;
