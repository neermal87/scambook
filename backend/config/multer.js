const path = require('path');
const fs = require('fs');
const multer = require('multer');

const root = path.join(__dirname, '..');
const profilesDir = path.join(root, 'assets', 'uploads', 'profiles');
const postsDir = path.join(root, 'assets', 'uploads', 'posts');

[profilesDir, postsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function fileFilter(req, file, cb) {
  if (ALLOWED.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
}

function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, subdir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
      cb(null, safe);
    },
  });
}

/** Profile picture uploads — local disk; swap to multer-s3 later for AWS S3 */
const uploadProfile = multer({
  storage: makeStorage(profilesDir),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('profile_image');

/** Post image uploads */
const uploadPost = multer({
  storage: makeStorage(postsDir),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('image');

module.exports = { uploadProfile, uploadPost };
