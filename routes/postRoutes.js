const express = require('express');
const postController = require('../controllers/postController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { uploadPost } = require('../config/multer');

const router = express.Router();

function postImageUpload(req, res, next) {
  uploadPost(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
}

router.post('/create-post', authenticateToken, postImageUpload, postController.createPost);
router.get('/posts', optionalAuth, postController.getPosts);
router.post('/comment', authenticateToken, postController.addComment);
router.post('/like', authenticateToken, postController.toggleLike);

module.exports = router;
