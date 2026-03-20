const path = require('path');
const userModel = require('../models/userModel');
const { sanitizeUser } = require('./authController');

/**
 * PUT /update-profile — multipart: name (field), optional profile_image (file)
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    let name = req.body.name;

    if (name === undefined || name === null) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 255 characters',
      });
    }

    let profileImageUrl;
    if (req.file) {
      // Public URL path (same structure works when moving files to S3: store full HTTPS URL)
      const rel = path.posix.join(
        '/assets/uploads/profiles',
        req.file.filename
      );
      profileImageUrl = rel.replace(/\\/g, '/');
    }

    const user = await userModel.updateUserProfile(userId, {
      name,
      profileImage: profileImageUrl,
    });

    return res.json({
      success: true,
      message: 'Profile updated',
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('updateProfile', err);
    return res.status(500).json({ success: false, message: 'Could not update profile' });
  }
}

/**
 * GET /me — current user (optional helper for frontend)
 */
async function getMe(req, res) {
  try {
    const user = await userModel.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('getMe', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { updateProfile, getMe };
