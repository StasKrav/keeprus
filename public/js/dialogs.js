
// ============================================
// GENERIC CONFIRM DIALOG
// ============================================

let confirmCallback = null;

function showConfirmDialog(
  namespace,
  id,
  icon,
  title,
  message,
  okText,
  callback,
) {
  const dialog = document.getElementById("genericConfirmDialog");
  document.getElementById("genericConfirmIcon").textContent = icon || "warning";
  document.getElementById("genericConfirmTitle").textContent =
    title || "Подтверждение";
  document.getElementById("genericConfirmMessage").textContent = message || "";
  document.getElementById("genericConfirmOkBtn").textContent =
    okText || "Подтвердить";

  confirmCallback = { namespace, id, callback };
  dialog.classList.add("visible");
}

function closeGenericConfirm() {
  document.getElementById("genericConfirmDialog").classList.remove("visible");
  confirmCallback = null;
}

// ============================================
// PROMPT DIALOG
// ============================================

let promptCallback = null;

function showPromptDialog(callback) {
  const dialog = document.getElementById("promptDialog");
  const input = document.getElementById("promptInput");
  input.value = "";
  promptCallback = callback;
  dialog.classList.add("visible");
  setTimeout(() => input.focus(), 100);
}

function closePromptDialog() {
  document.getElementById("promptDialog").classList.remove("visible");
  promptCallback = null;
}

function clearTrash() {
    const trashedNotes = notes.filter(n => n.trashed);
    
    if (trashedNotes.length === 0) {
        return;
    }
    
    showConfirmDialog(
        'clear_trash',
        'clear_trash',
        'delete_sweep',
        'Очистить корзину?',
        `В корзине ${trashedNotes.length} заметок. Они будут удалены без возможности восстановления.`,
        'Очистить',
        () => {
            notes = notes.filter(n => !n.trashed);
            saveNotes();
            renderNotes();
        }
    );
}
