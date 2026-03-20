const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    profile_image: row.profile_image,
    created_at: row.created_at,
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /register — create account with hashed password
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 255 characters',
      });
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    const existing = await userModel.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await userModel.createUser({
      name: name.trim(),
      email: email.trim(),
      passwordHash,
    });

    const user = await userModel.findUserById(userId);
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('register', err);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
}

/**
 * POST /login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);
    delete user.password;

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('login', err);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
}

module.exports = { register, login, sanitizeUser };
