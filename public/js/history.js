// ============================================
// ИСТОРИЯ ВЕРСИЙ ЗАМЕТОК (Упрощённая версия)
// ============================================

const MAX_HISTORY_VERSIONS = 20;

// ============================================
// СОЗДАНИЕ ВЕРСИИ (только при закрытии)
// ============================================

function createVersion(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Проверяем, есть ли изменения
    const lastVersion = note.history?.[0];
    if (lastVersion && 
        lastVersion.content === note.content && 
        lastVersion.title === note.title) {
        return; // Ничего не изменилось
    }
    
    if (!note.history) note.history = [];
    
    // Добавляем новую версию
    note.history.unshift({
        title: note.title || '',
        content: note.content || '',
        date: new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: Date.now(),
        version: (note.history.length || 0) + 1
    });
    
    // Оставляем только последние N версий
    if (note.history.length > MAX_HISTORY_VERSIONS) {
        note.history.pop();
    }
    
    // Обновляем дату заметки
    note.date = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    saveNotes();
}

// ============================================
// ПОКАЗ ИСТОРИИ
// ============================================

function showHistory(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) {
        showToast('Заметка не найдена');
        return;
    }
    
    if (!note.history || note.history.length === 0) {
        showToast('Нет сохранённых версий');
        return;
    }
    
    // Создаём модалку
    const overlay = document.createElement('div');
    overlay.className = 'history-overlay';
    overlay.id = 'historyOverlay';
    
    overlay.innerHTML = `
        <div class="history-modal">
            <div class="history-header">
                <div class="history-header-left">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span class="history-title">История версий</span>
                </div>
                <button class="history-close" onclick="closeHistory()">✕</button>
            </div>
            
            <div class="history-note-title">${escapeHtml(note.title) || 'Без названия'}</div>
            
            <div class="history-list" id="historyList">
                ${note.history.map((version, index) => `
                    <div class="history-item ${index === 0 ? 'history-item-current' : ''}" 
                         data-index="${index}"
                         onclick="previewVersion(${noteId}, ${index})">
                        <div class="history-item-left">
                            <div class="history-item-badge">${index === 0 ? 'Текущая' : `Версия ${note.history.length - index}`}</div>
                            <div class="history-item-date">${version.date}</div>
                        </div>
                        <div class="history-item-preview">
                            ${version.content.slice(0, 80)}${version.content.length > 80 ? '...' : ''}
                        </div>
                        ${index > 0 ? `
                            <button class="history-restore-btn" onclick="event.stopPropagation(); restoreVersion(${noteId}, ${index})">
                                Восстановить
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="history-footer">
                <span class="history-footer-info">Всего версий: ${note.history.length}</span>
                <button class="history-footer-btn" onclick="closeHistory()">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Закрытие по клику на оверлей
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeHistory();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', historyEscapeHandler);
}

function historyEscapeHandler(e) {
    if (e.key === 'Escape') {
        closeHistory();
    }
}

function closeHistory() {
    const overlay = document.getElementById('historyOverlay');
    if (overlay) {
        overlay.remove();
    }
    document.removeEventListener('keydown', historyEscapeHandler);
}

// ============================================
// ПРЕВЬЮ ВЕРСИИ
// ============================================

let previewedVersionIndex = null;

function previewVersion(noteId, index) {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.history[index]) return;
    
    const version = note.history[index];
    previewedVersionIndex = index;
    
    // Обновляем стили элементов
    document.querySelectorAll('.history-item').forEach(el => {
        el.classList.remove('history-item-active');
    });
    
    const item = document.querySelector(`.history-item[data-index="${index}"]`);
    if (item) {
        item.classList.add('history-item-active');
    }
    
    // Показываем превью
    let previewContainer = document.querySelector('.history-preview');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.className = 'history-preview';
        const list = document.getElementById('historyList');
        if (list) {
            list.parentNode.insertBefore(previewContainer, list.nextSibling);
        }
    }
    
    previewContainer.innerHTML = `
        <div class="history-preview-header">
            <span class="history-preview-title">Превью версии ${note.history.length - index}</span>
            <span class="history-preview-date">${version.date}</span>
        </div>
        <div class="history-preview-content">
            ${version.title ? `<h3>${escapeHtml(version.title)}</h3>` : ''}
            ${version.content ? renderMarkdown(version.content) : '<em>Пустая заметка</em>'}
        </div>
        <div class="history-preview-actions">
            <button class="history-preview-btn" onclick="restoreVersion(${noteId}, ${index})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/>
                    <polyline points="12 8 12 12 14 14"/>
                </svg>
                Восстановить эту версию
            </button>
        </div>
    `;
}

// ============================================
// ВОССТАНОВЛЕНИЕ ВЕРСИИ
// ============================================

function restoreVersion(noteId, index) {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.history[index]) return;
    
    const version = note.history[index];
    
    // Сохраняем текущую версию в историю (на случай отката)
    note.history.unshift({
        title: note.title || '',
        content: note.content || '',
        date: new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: Date.now(),
        version: 'откат'
    });
    
    // Восстанавливаем выбранную версию
    note.title = version.title;
    note.content = version.content;
    note.date = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Удаляем дубликат восстановленной версии
    const restoredIndex = index + 1;
    if (note.history[restoredIndex]) {
        note.history.splice(restoredIndex, 1);
    }
    
    saveNotes();
    closeHistory();
    
    // Обновляем интерфейс
    if (typeof updateNoteCard === 'function') {
        updateNoteCard(noteId);
    } else {
        renderNotes();
    }
    
    showToast('✅ Версия восстановлена!');
}

// ============================================
// КНОПКА "ИСТОРИЯ" В РЕДАКТОРЕ
// ============================================

function addHistoryButtonToEditor() {
    const editorFooter = document.querySelector('.editor-actions');
    if (!editorFooter) return;
    
    // Проверяем, есть ли уже кнопка
    if (document.getElementById('historyEditorBtn')) return;
    
    const historyBtn = document.createElement('button');
    historyBtn.className = 'action-button';
    historyBtn.id = 'historyEditorBtn';
    historyBtn.title = 'История версий';
    historyBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    `;
    
    historyBtn.addEventListener('click', showHistoryForCurrentNote);
    
    // Вставляем перед последней кнопкой
    const lastButton = editorFooter.lastElementChild;
    editorFooter.insertBefore(historyBtn, lastButton);
}

// ============================================
// ОБЁРТКА ДЛЯ ВЫЗОВА ИЗ HTML
// ============================================

function showHistoryForCurrentNote() {
    if (!currentNoteId) {
        showToast('Сначала сохраните заметку');
        return;
    }
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) {
        showToast('Заметка не найдена');
        return;
    }
    
    if (!note.history || note.history.length === 0) {
        showToast('Нет сохранённых версий');
        return;
    }
    
    showHistory(currentNoteId);
}

// ============================================
// СОХРАНЯЕМ ВЕРСИЮ ПРИ ЗАКРЫТИИ РЕДАКТОРА
// ============================================

// Патчим closeEditor
const originalCloseEditor = window.closeEditor;
if (originalCloseEditor) {
    window.closeEditor = function() {
        // Сохраняем версию при закрытии, если есть изменения
        if (currentNoteId && hasUnsavedChanges) {
            // Берём актуальные данные из редактора
            const title = document.getElementById('noteTitle').value.trim();
            const content = document.getElementById('noteContent').value.trim();
            
            const note = notes.find(n => n.id === currentNoteId);
            if (note) {
                // Обновляем заметку перед сохранением версии
                note.title = title;
                note.content = content;
                createVersion(currentNoteId);
            }
        }
        
        // Вызываем оригинальную функцию
        originalCloseEditor.apply(this, arguments);
    };
}

// ============================================
// ПРИ СОЗДАНИИ НОВОЙ ЗАМЕТКИ — ИНИЦИАЛИЗИРУЕМ ИСТОРИЮ
// ============================================

// Патчим addNote
const originalAddNote = window.addNote;
if (originalAddNote) {
    window.addNote = function() {
        originalAddNote.apply(this, arguments);
        // Для новой заметки инициализируем историю
        // (она создастся при первом сохранении)
    };
}

// ============================================
// ЭКСПОРТ ФУНКЦИЙ
// ============================================

window.createVersion = createVersion;
window.showHistory = showHistory;
window.closeHistory = closeHistory;
window.previewVersion = previewVersion;
window.restoreVersion = restoreVersion;
window.addHistoryButtonToEditor = addHistoryButtonToEditor;
window.showHistoryForCurrentNote = showHistoryForCurrentNote;

console.log('📜 История версий загружена (сохранение только при закрытии)');
