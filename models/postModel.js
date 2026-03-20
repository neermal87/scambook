const pool = require('../config/db');

/**
 * Posts, comments, likes — structured for future S3 URLs in image_url fields
 */
async function createPost({ userId, content, imageUrl }) {
  const [result] = await pool.execute(
    'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
    [userId, content ?? '', imageUrl || null]
  );
  return result.insertId;
}

/** Single post with same shape as getPostsWithMeta items */
async function getPostByIdWithMeta(postId, viewerUserId) {
  const [posts] = await pool.execute(
    `SELECT p.id, p.user_id, p.content, p.image_url, p.created_at,
            u.name AS author_name, u.profile_image AS author_profile_image
     FROM posts p
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.id = ?`,
    [postId]
  );
  if (!posts.length) return null;
  const p = posts[0];

  const [likeRows] = await pool.execute(
    'SELECT COUNT(*) AS cnt FROM likes WHERE post_id = ?',
    [postId]
  );
  const like_count = Number(likeRows[0].cnt);

  let liked_by_me = false;
  if (viewerUserId) {
    const [mine] = await pool.execute(
      'SELECT id FROM likes WHERE post_id = ? AND user_id = ? LIMIT 1',
      [postId, viewerUserId]
    );
    liked_by_me = mine.length > 0;
  }

  const [commentRows] = await pool.execute(
    `SELECT c.id, c.post_id, c.user_id, c.comment, c.created_at,
            u.name AS author_name, u.profile_image AS author_profile_image
     FROM comments c
     INNER JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [postId]
  );

  return {
    id: p.id,
    user_id: p.user_id,
    content: p.content,
    image_url: p.image_url,
    created_at: p.created_at,
    author_name: p.author_name,
    author_profile_image: p.author_profile_image,
    like_count,
    liked_by_me,
    comments: commentRows.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      comment: c.comment,
      created_at: c.created_at,
      author_name: c.author_name,
      author_profile_image: c.author_profile_image,
    })),
  };
}

async function getPostsWithMeta(viewerUserId) {
  const [posts] = await pool.execute(
    `SELECT p.id, p.user_id, p.content, p.image_url, p.created_at,
            u.name AS author_name, u.profile_image AS author_profile_image
     FROM posts p
     INNER JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC`
  );

  if (posts.length === 0) return [];

  const ids = posts.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(',');

  const [likeRows] = await pool.execute(
    `SELECT post_id, COUNT(*) AS cnt FROM likes WHERE post_id IN (${placeholders}) GROUP BY post_id`,
    ids
  );
  const likeMap = Object.fromEntries(likeRows.map((r) => [r.post_id, Number(r.cnt)]));

  let likedSet = new Set();
  if (viewerUserId) {
    const [myLikes] = await pool.execute(
      `SELECT post_id FROM likes WHERE user_id = ? AND post_id IN (${placeholders})`,
      [viewerUserId, ...ids]
    );
    likedSet = new Set(myLikes.map((r) => r.post_id));
  }

  const [commentRows] = await pool.execute(
    `SELECT c.id, c.post_id, c.user_id, c.comment, c.created_at,
            u.name AS author_name, u.profile_image AS author_profile_image
     FROM comments c
     INNER JOIN users u ON u.id = c.user_id
     WHERE c.post_id IN (${placeholders})
     ORDER BY c.created_at ASC`,
    ids
  );

  const commentsByPost = {};
  for (const c of commentRows) {
    if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
    commentsByPost[c.post_id].push({
      id: c.id,
      user_id: c.user_id,
      comment: c.comment,
      created_at: c.created_at,
      author_name: c.author_name,
      author_profile_image: c.author_profile_image,
    });
  }

  return posts.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    content: p.content,
    image_url: p.image_url,
    created_at: p.created_at,
    author_name: p.author_name,
    author_profile_image: p.author_profile_image,
    like_count: likeMap[p.id] || 0,
    liked_by_me: likedSet.has(p.id),
    comments: commentsByPost[p.id] || [],
  }));
}

async function addComment({ postId, userId, text }) {
  const [result] = await pool.execute(
    'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
    [postId, userId, text]
  );
  return result.insertId;
}

async function postExists(postId) {
  const [rows] = await pool.execute('SELECT id FROM posts WHERE id = ? LIMIT 1', [postId]);
  return !!rows[0];
}

/**
 * Toggle like: returns { liked: boolean, like_count }
 */
async function toggleLike({ postId, userId }) {
  const [existing] = await pool.execute(
    'SELECT id FROM likes WHERE post_id = ? AND user_id = ? LIMIT 1',
    [postId, userId]
  );

  if (existing.length) {
    await pool.execute('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } else {
    await pool.execute('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  }

  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS cnt FROM likes WHERE post_id = ?',
    [postId]
  );
  const like_count = Number(countRows[0].cnt);
  return { liked: !existing.length, like_count };
}

module.exports = {
  createPost,
  getPostByIdWithMeta,
  getPostsWithMeta,
  addComment,
  postExists,
  toggleLike,
};
