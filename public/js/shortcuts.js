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
// КЛАВИАТУРНЫЕ СОЧЕТАНИЯ (ФИНАЛЬНАЯ ВЕРСИЯ)
// ============================================

document.addEventListener('keydown', function(e) {
    // Ctrl+N — новая заметка
    if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        addNote();
        return false;
    }
    
    // Ctrl+S — сохранить (только если редактор открыт)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        const editor = document.getElementById('noteEditor');
        if (editor && editor.classList.contains('visible')) {
            e.preventDefault();
            e.stopPropagation();
            saveNote();
            return false;
        }
    }
    
    // Escape — закрыть редактор
    if (e.key === 'Escape') {
        const editor = document.getElementById('noteEditor');
        if (editor && editor.classList.contains('visible')) {
            e.preventDefault();
            e.stopPropagation();
            closeEditor();
            return false;
        }
    }
}, true); // ← true = перехват на фазе capture
