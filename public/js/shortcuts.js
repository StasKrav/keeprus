// ============================================
// ГОРЯЧИЕ КЛАВИШИ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ============================================

document.addEventListener('keydown', function(e) {
    // Проверяем, не введён ли текст в поле ввода
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    // Ctrl+N — новая заметка (РАБОТАЕТ ВЕЗДЕ)
    if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault(); // ← КЛЮЧЕВОЙ МОМЕНТ
        e.stopPropagation();
        
        // Если редактор открыт — сначала сохраняем
        const editor = document.getElementById('noteEditor');
        if (editor && editor.classList.contains('visible')) {
            if (hasUnsavedChanges) {
                saveNote();
            } else {
                closeEditor();
            }
        }
        
        setTimeout(addNote, 100);
        return false;
    }
    
    // Ctrl+S — сохранить (ТОЛЬКО если редактор открыт)
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
        
        // Закрыть хамбургер
        const hamburger = document.getElementById('hamburgerMenu');
        if (hamburger && hamburger.classList.contains('visible')) {
            closeHamburgerMenu();
            return false;
        }
    }
    
    // Ctrl+Shift+E — экспорт (для себя)
    if (e.ctrlKey && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        saveNotesAs();
        return false;
    }
    
    // Ctrl+Shift+I — импорт
    if (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        openNotesFile();
        return false;
    }
    
    // Ctrl+F — фокус на поиск (если не в поле ввода)
    if (e.ctrlKey && (e.key === 'f' || e.key === 'F') && !isInput) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        return false;
    }
    
    // Ctrl+A — выделить все заметки (если не в поле ввода)
    if (e.ctrlKey && (e.key === 'a' || e.key === 'A') && !isInput) {
        e.preventDefault();
        if (window.selection) {
            selection.selectAll();
        }
        return false;
    }
}, true); // ← ВАЖНО: capture фаза, чтобы перехватить до браузера
