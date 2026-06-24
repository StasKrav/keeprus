
// ============================================
// TOAST NOTIFICATION
// ============================================

let toastTimeout;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2500);
}

