/**
 * Feed page — load posts, create, like, comment, filter "My Posts"
 */
(function () {
  if (!requireAuth()) return;

  const user = getUser();
  let feedFilter = 'all';
  let postsCache = [];
  /** When set, filter feed by this query (client-side demo search). */
  let searchQuery = '';

  const navAvatar = document.getElementById('navAvatar');
  const composerAvatar = document.getElementById('composerAvatar');
  const postsContainer = document.getElementById('postsContainer');
  const emptyState = document.getElementById('emptyState');
  const feedAlert = document.getElementById('feedAlert');
  const postContent = document.getElementById('postContent');
  const postImage = document.getElementById('postImage');
  const imageName = document.getElementById('imageName');

  function showAlert(msg, type = 'danger') {
    feedAlert.innerHTML = '<div class="alert alert-' + type + ' py-2">' + msg + '</div>';
    setTimeout(() => {
      feedAlert.innerHTML = '';
    }, 5000);
  }

  function setAvatars() {
    const src = avatarUrl(user && user.profile_image);
    navAvatar.src = src;
    composerAvatar.src = src;
  }

  function filteredPosts() {
    let list = postsCache;
    if (feedFilter === 'mine' && user) {
      list = list.filter((p) => p.user_id === user.id);
    }
    if (searchQuery) {
      const q = searchQuery;
      list = list.filter(
        (p) =>
          (p.content && p.content.toLowerCase().includes(q)) ||
          (p.author_name && p.author_name.toLowerCase().includes(q))
      );
    }
    return list;
  }

  function renderPosts() {
    const list = filteredPosts();
    postsContainer.innerHTML = '';
    emptyState.classList.toggle('d-none', list.length > 0);

    list.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'card post-card mb-3';
      card.dataset.postId = p.id;

      const commentsHtml = (p.comments || [])
        .map(
          (c) =>
            '<div class="comment-row d-flex gap-2">' +
            '<img class="avatar-xs flex-shrink-0" src="' +
            avatarUrl(c.author_profile_image) +
            '" alt=""/>' +
            '<div><strong>' +
            escapeHtml(c.author_name) +
            '</strong> ' +
            escapeHtml(c.comment) +
            '<div class="post-meta">' +
            formatTime(c.created_at) +
            '</div></div></div>'
        )
        .join('');

      card.innerHTML =
        '<div class="card-body">' +
        '<div class="post-header mb-2">' +
        '<img class="avatar-sm" src="' +
        avatarUrl(p.author_profile_image) +
        '" alt=""/>' +
        '<div>' +
        '<div class="fw-semibold">' +
        escapeHtml(p.author_name) +
        '</div>' +
        '<div class="post-meta">' +
        formatTime(p.created_at) +
        '</div></div></div>' +
        (p.content ? '<p class="mb-2">' + escapeHtml(p.content) + '</p>' : '') +
        (p.image_url
          ? '<img class="post-image mb-2" src="' +
            escapeHtml(p.image_url) +
            '" alt="Post image"/>'
          : '') +
        '<div class="post-actions d-flex flex-wrap align-items-center gap-1">' +
        '<button type="button" class="like-btn ' +
        (p.liked_by_me ? 'liked' : '') +
        '" data-id="' +
        p.id +
        '"><i class="bi bi-hand-thumbs-up-fill me-1"></i> Like · <span class="like-count">' +
        (p.like_count || 0) +
        '</span></button>' +
        '</div>' +
        '<div class="mt-2 small fw-semibold text-secondary">Comments</div>' +
        '<div class="comments-list">' +
        commentsHtml +
        '</div>' +
        '<div class="input-group input-group-sm mt-2">' +
        '<input type="text" class="form-control comment-input" placeholder="Write a comment…" data-post="' +
        p.id +
        '"/>' +
        '<button class="btn btn-outline-primary comment-send" type="button" data-post="' +
        p.id +
        '">Reply</button>' +
        '</div></div>';

      postsContainer.appendChild(card);
    });

    bindPostEvents();
  }

  function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  async function loadPosts() {
    try {
      const data = await apiFetch('/posts', { method: 'GET' });
      postsCache = data.posts || [];
      renderPosts();
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        clearSession();
        window.location.href = '/login.html';
        return;
      }
      showAlert(e.message || 'Could not load feed');
    }
  }

  function bindPostEvents() {
    document.querySelectorAll('.like-btn').forEach((btn) => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        try {
          const data = await apiFetch('/like', {
            method: 'POST',
            body: JSON.stringify({ post_id: id }),
          });
          const post = postsCache.find((x) => x.id === id);
          if (post) {
            post.liked_by_me = data.liked;
            post.like_count = data.like_count;
          }
          renderPosts();
        } catch (e) {
          showAlert(e.message || 'Like failed');
        }
      };
    });

    document.querySelectorAll('.comment-send').forEach((btn) => {
      btn.onclick = async () => {
        const postId = Number(btn.dataset.post);
        const input = document.querySelector('.comment-input[data-post="' + postId + '"]');
        const text = input && input.value.trim();
        if (!text) return;
        try {
          await apiFetch('/comment', {
            method: 'POST',
            body: JSON.stringify({ post_id: postId, comment: text }),
          });
          input.value = '';
          await loadPosts();
        } catch (e) {
          showAlert(e.message || 'Comment failed');
        }
      };
    });
  }

  document.getElementById('btnCreatePost').onclick = async () => {
    const text = postContent.value.trim();
    const file = postImage.files[0];
    if (!text && !file) {
      showAlert('Add text or an image to post.');
      return;
    }
    try {
      let res;
      if (file) {
        const fd = new FormData();
        fd.append('content', text);
        fd.append('image', file);
        const headers = {};
        const token = getToken();
        if (token) headers.Authorization = 'Bearer ' + token;
        res = await fetch('/create-post', { method: 'POST', headers, body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Post failed');
      } else {
        await apiFetch('/create-post', {
          method: 'POST',
          body: JSON.stringify({ content: text }),
        });
      }
      postContent.value = '';
      postImage.value = '';
      imageName.textContent = '';
      showAlert('Post published.', 'success');
      await loadPosts();
    } catch (e) {
      showAlert(e.message || 'Could not create post');
    }
  };

  postImage.addEventListener('change', () => {
    imageName.textContent = postImage.files[0] ? postImage.files[0].name : '';
  });

  document.querySelectorAll('[data-feed]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      feedFilter = el.getAttribute('data-feed');
      searchQuery = '';
      document.getElementById('navSearch').value = '';
      document.querySelectorAll('[data-feed]').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
      renderPosts();
    });
  });

  function logout() {
    clearSession();
    window.location.href = '/login.html';
  }
  document.getElementById('logoutNav').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
  document.getElementById('logoutSide').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  document.getElementById('notifBtn').addEventListener('click', () => {
    showAlert('Notifications: connect SNS / mobile push in production.', 'info');
  });

  document.getElementById('navSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = e.target.value.trim().toLowerCase();
      searchQuery = q;
      renderPosts();
      if (q) {
        showAlert('Search is local demo — wire to OpenSearch/DB for production.', 'info');
      }
    }
  });

  setAvatars();
  loadPosts();
})();
