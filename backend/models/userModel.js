const pool = require('../config/db');

/**
 * User data access — maps to `users` table
 */
async function createUser({ username, name, email, passwordHash, profileImage = null }) {
  const [result] = await pool.execute(
    'INSERT INTO users (username, name, email, password, profile_image) VALUES (?, ?, ?, ?, ?)',
    [
      username.trim(),
      name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      profileImage,
    ]
  );
  return result.insertId;
}

async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, username, name, email, password, profile_image, created_at FROM users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, username, name, email, profile_image, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findUserByUsername(username) {
  const [rows] = await pool.execute(
    'SELECT id, username FROM users WHERE username = ? LIMIT 1',
    [username.trim()]
  );
  return rows[0] || null;
}

async function updateUserProfile(userId, { name, profileImage }) {
  if (profileImage !== undefined) {
    await pool.execute(
      'UPDATE users SET name = ?, profile_image = ? WHERE id = ?',
      [name.trim(), profileImage, userId]
    );
  } else {
    await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name.trim(), userId]);
  }
  return findUserById(userId);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  updateUserProfile,
};
