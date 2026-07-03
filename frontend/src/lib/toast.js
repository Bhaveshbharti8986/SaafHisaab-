// Updated showToast: type first, then me
// utils/showToast.js
export function showToast(type, message) {
  window.dispatchEvent(
    new CustomEvent('show-toast', { detail: { message, type } })
  );
}
