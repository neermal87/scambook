/**
 * Profile page — load /me, submit PUT /update-profile (multipart)
 */
(function () {
  if (!requireAuth()) return;

  const navAvatar = document.getElementById('navAvatar');
  const profileAvatar = document.getElementById('profileAvatar');
  const displayName = document.getElementById('displayName');
  const displayEmail = document.getElementById('displayEmail');
  const inputName = document.getElementById('inputName');
  const profileForm = document.getElementById('profileForm');
  const profileAlert = document.getElementById('profileAlert');

  function showAlert(msg, type) {
    profileAlert.innerHTML = '<div class="alert alert-' + type + ' py-2">' + msg + '</div>';
  }

  async function refreshUser() {
    try {
      const data = await apiFetch('/me', { method: 'GET' });
      const u = data.user;
      displayName.textContent = u.name;
      displayEmail.textContent = u.email;
      inputName.value = u.name;
      const src = avatarUrl(u.profile_image);
      navAvatar.src = src;
      profileAvatar.src = src;
      setSession(getToken(), u);
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        clearSession();
        window.location.href = '/login.html';
        return;
      }
      const local = getUser();
      if (local) {
        displayName.textContent = local.name;
        displayEmail.textContent = local.email;
        inputName.value = local.name;
        const src = avatarUrl(local.profile_image);
        navAvatar.src = src;
        profileAvatar.src = src;
      }
      showAlert(e.message || 'Could not load profile', 'warning');
    }
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    profileAlert.innerHTML = '';
    const fd = new FormData();
    fd.append('name', inputName.value.trim());
    const fileInput = document.getElementById('inputImage');
    if (fileInput.files[0]) {
      fd.append('profile_image', fileInput.files[0]);
    }

    try {
      const headers = {};
      const token = getToken();
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await fetch('/update-profile', { method: 'PUT', headers, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      if (data.user) setSession(token, data.user);
      showAlert('Profile saved.', 'success');
      await refreshUser();
      fileInput.value = '';
    } catch (err) {
      showAlert(err.message || 'Could not save', 'danger');
    }
  });

  document.getElementById('logoutNav').addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = '/login.html';
  });

  refreshUser();
})();
