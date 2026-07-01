// ============================================
// GENERIC CONFIRM DIALOG (ЕДИНАЯ ВЕРСИЯ)
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
  window._genericConfirmCallback = null;
}

// ============================================
// ПРОМПТ ДИАЛОГ
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

// ============================================
// ОЧИСТКА КОРЗИНЫ (ГЛАВНАЯ ФУНКЦИЯ)
// ============================================

function clearTrash() {
    const trashedNotes = notes.filter(n => n.trashed);
    
    if (trashedNotes.length === 0) {
        showToast('Корзина уже пуста');
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
            // УДАЛЯЕМ ВСЕ ЗАМЕТКИ ИЗ КОРЗИНЫ НАВСЕГДА
            notes = notes.filter(n => !n.trashed);
            saveNotes();
            
            // Очищаем кэш и перерисовываем
            if (typeof clearCardCache === 'function') {
                clearCardCache();
            }
            renderNotes();
            updateCounts();
            
            showToast('Корзина очищена');
        }
    );
}

// ============================================
// УНИВЕРСАЛЬНЫЙ ДИАЛОГ ПОДТВЕРЖДЕНИЯ
// ============================================

function showGenericConfirmDialog(title, message, okText, callback) {
    showConfirmDialog(
        'generic',
        'generic',
        'warning',
        title,
        message,
        okText,
        callback
    );
}

// ============================================
// ОБРАБОТЧИКИ КНОПОК
// ============================================

// OK
document.getElementById("genericConfirmOkBtn").addEventListener("click", () => {
    if (confirmCallback && confirmCallback.callback) {
        confirmCallback.callback();
    }
    closeGenericConfirm();
});

// Cancel
document.getElementById("genericConfirmCancelBtn").addEventListener("click", () => {
    closeGenericConfirm();
});

// Закрытие по клику на оверлей
document.getElementById("genericConfirmDialog").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
        closeGenericConfirm();
    }
});

// ============================================
// ЭКСПОРТ
// ============================================

window.showConfirmDialog = showConfirmDialog;
window.showGenericConfirmDialog = showGenericConfirmDialog;
window.closeGenericConfirm = closeGenericConfirm;
window.clearTrash = clearTrash;
window.showPromptDialog = showPromptDialog;
window.closePromptDialog = closePromptDialog;

console.log('✅ Диалоги загружены');
