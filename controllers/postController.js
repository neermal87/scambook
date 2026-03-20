const path = require('path');
const postModel = require('../models/postModel');

/**
 * POST /create-post — text + optional image
 */
async function createPost(req, res) {
  try {
    const userId = req.user.id;
    const content = req.body.content;

    const text =
      content === undefined || content === null
        ? ''
        : typeof content === 'string'
          ? content.trim()
          : '';

    let imageUrl;
    if (req.file) {
      imageUrl = path.posix
        .join('/assets/uploads/posts', req.file.filename)
        .replace(/\\/g, '/');
    }

    if (!text && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Post must include text and/or an image',
      });
    }
    if (text.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Post text is too long (max 10000 characters)',
      });
    }

    const postId = await postModel.createPost({
      userId,
      content: text || null,
      imageUrl: imageUrl || null,
    });

    const created = await postModel.getPostByIdWithMeta(postId, userId);

    return res.status(201).json({
      success: true,
      message: 'Post created',
      post: created,
    });
  } catch (err) {
    console.error('createPost', err);
    return res.status(500).json({ success: false, message: 'Could not create post' });
  }
}

/**
 * GET /posts — feed with likes & comments; pass Authorization for liked_by_me
 */
async function getPosts(req, res) {
  try {
    const viewerId = req.user ? req.user.id : null;
    const posts = await postModel.getPostsWithMeta(viewerId);
    return res.json({ success: true, posts });
  } catch (err) {
    console.error('getPosts', err);
    return res.status(500).json({ success: false, message: 'Could not load posts' });
  }
}

/**
 * POST /comment
 */
async function addComment(req, res) {
  try {
    const userId = req.user.id;
    const { post_id, comment } = req.body;

    const pid = Number(post_id);
    if (!Number.isInteger(pid) || pid < 1) {
      return res.status(400).json({ success: false, message: 'Valid post_id is required' });
    }
    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    if (comment.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Comment is too long' });
    }

    const exists = await postModel.postExists(pid);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await postModel.addComment({
      postId: pid,
      userId,
      text: comment.trim(),
    });

    const posts = await postModel.getPostsWithMeta(userId);
    const post = posts.find((p) => p.id === pid);

    return res.status(201).json({
      success: true,
      message: 'Comment added',
      post,
    });
  } catch (err) {
    console.error('addComment', err);
    return res.status(500).json({ success: false, message: 'Could not add comment' });
  }
}

/**
 * POST /like — toggle like on a post
 */
async function toggleLike(req, res) {
  try {
    const userId = req.user.id;
    const { post_id } = req.body;
    const pid = Number(post_id);

    if (!Number.isInteger(pid) || pid < 1) {
      return res.status(400).json({ success: false, message: 'Valid post_id is required' });
    }

    const exists = await postModel.postExists(pid);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const result = await postModel.toggleLike({ postId: pid, userId });

    return res.json({
      success: true,
      post_id: pid,
      liked: result.liked,
      like_count: result.like_count,
    });
  } catch (err) {
    console.error('toggleLike', err);
    return res.status(500).json({ success: false, message: 'Could not update like' });
  }
}

module.exports = { createPost, getPosts, addComment, toggleLike };
