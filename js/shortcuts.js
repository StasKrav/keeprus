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
// КЛАВИАТУРНЫЕ СОЧЕТАНИЯ (АГРЕССИВНЫЙ ПЕРЕХВАТ)
// ============================================

console.log('⌨️ Регистрация хоткеев (агрессивный)');

// 1. Перехват на window с capture
window.addEventListener('keydown', function(e) {
    console.log('🔑 Window keydown:', e.key, 'Code:', e.code, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
    
    // Ctrl+N
    if (e.ctrlKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
        console.log('✅ Ctrl+N ПЕРЕХВАЧЕН!');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (typeof addNote === 'function') {
            addNote();
        } else {
            console.error('❌ addNote не определена');
        }
        return false;
    }
    
    // Ctrl+S (только в редакторе)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        const editor = document.getElementById('noteEditor');
        if (editor && editor.classList.contains('visible')) {
            console.log('✅ Ctrl+S ПЕРЕХВАЧЕН!');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (typeof saveNote === 'function') {
                saveNote();
            } else {
                console.error('❌ saveNote не определена');
            }
            return false;
        }
    }
    
    // Escape
    if (e.key === 'Escape' || e.code === 'Escape') {
        console.log('✅ Escape ПЕРЕХВАЧЕН!');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (typeof closeEditor === 'function') {
            closeEditor();
        } else {
            console.error('❌ closeEditor не определена');
        }
        return false;
    }
}, true);

// 2. Дубль на document
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
        console.log('🔄 Document: Ctrl+N');
        e.preventDefault();
        e.stopPropagation();
        if (typeof addNote === 'function') addNote();
        return false;
    }
    
    if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        const editor = document.getElementById('noteEditor');
        if (editor && editor.classList.contains('visible')) {
            console.log('🔄 Document: Ctrl+S');
            e.preventDefault();
            e.stopPropagation();
            if (typeof saveNote === 'function') saveNote();
            return false;
        }
    }
    
    if (e.key === 'Escape' || e.code === 'Escape') {
        console.log('🔄 Document: Escape');
        e.preventDefault();
        e.stopPropagation();
        if (typeof closeEditor === 'function') closeEditor();
        return false;
    }
}, true);

// 3. Блокировка всех браузерных хоткеев
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        const blocked = ['n', 's', 'w', 't', 'o', 'f', 'p', 'r'];
        if (blocked.includes(key)) {
            const tag = e.target.tagName.toLowerCase();
            if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
                console.log('🚫 Блокировка браузерного хоткея: Ctrl+' + key);
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
}, true);

console.log('✅ Хоткеи зарегистрированы (агрессивный режим)');






