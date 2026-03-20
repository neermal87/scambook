/**
 * Shared UI helpers — avatars, relative time
 */
function avatarUrl(profileImage) {
  if (profileImage) return profileImage;
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
      '<rect fill="#e4e6eb" width="64" height="64"/>' +
      '<circle cx="32" cy="24" r="12" fill="#bcc0c4"/>' +
      '<ellipse cx="32" cy="52" rx="20" ry="14" fill="#bcc0c4"/>' +
    '</svg>'
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
