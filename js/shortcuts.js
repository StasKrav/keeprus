// Глобальный обработчик для магнитов (делегирование событий)
document.addEventListener('click', function(e) {
    const magnet = e.target.closest('.note-magnet');
    if (magnet) {
        e.stopPropagation();
        e.preventDefault();
        const noteId = parseInt(magnet.dataset.noteId);
        if (noteId) {
            togglePin(noteId, e);
        }
        return false;
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown", (e) => {
  // Ctrl+N - new note
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    addNote();
  }

  // Escape - close editor
  if (e.key === "Escape") {
    closeEditor();
  }

  // Ctrl+S - save note
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    if (document.getElementById("noteEditor").classList.contains("visible")) {
      e.preventDefault();
      saveNote();
    }
  }
});
