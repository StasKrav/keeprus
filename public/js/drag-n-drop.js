
// ============================================
// DRAG-AND-DROP ДЛЯ СОРТИРОВКИ ЗАМЕТОК
// ============================================

let draggedNoteId = null;
let dragTargetId = null;

function setupDragAndDrop() {
    const container = document.getElementById('notesContainer');
    
    // Используем делегирование событий
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('dragend', handleDragEnd);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    const card = e.target.closest('.note-card');
    if (!card) return;
    
    const noteId = parseInt(card.dataset.id);
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Запоминаем перетаскиваемую заметку
    draggedNoteId = noteId;
    
    // Добавляем класс для визуального эффекта
    card.classList.add('dragging');
    
    // Сохраняем данные для перетаскивания
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', noteId);
    
    // Скрываем стандартный курсор
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnd(e) {
    const card = e.target.closest('.note-card');
    if (card) {
        card.classList.remove('dragging');
    }
    
    // Убираем все индикаторы
    document.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    document.querySelectorAll('.note-card.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    
    draggedNoteId = null;
    dragTargetId = null;
}

function handleDragOver(e) {
    e.preventDefault(); // Разрешаем drop
    
    const card = e.target.closest('.note-card');
    if (!card) return;
    
    const targetId = parseInt(card.dataset.id);
    if (targetId === draggedNoteId) {
        // Нельзя перетащить на себя
        card.classList.remove('drag-over');
        return;
    }
    
    const draggedNote = notes.find(n => n.id === draggedNoteId);
    const targetNote = notes.find(n => n.id === targetId);
    if (!draggedNote || !targetNote) return;
    
    // Проверяем: можно ли перетащить?
    // Закреплённые можно перетаскивать только между закреплёнными
    // Незакреплённые можно перетаскивать только между незакреплёнными
    if (draggedNote.pinned !== targetNote.pinned) {
        card.classList.remove('drag-over');
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    
    // Разрешаем drop
    e.dataTransfer.dropEffect = 'move';
    card.classList.add('drag-over');
    dragTargetId = targetId;
}

function handleDragEnter(e) {
    e.preventDefault();
    const card = e.target.closest('.note-card');
    if (card) {
        // Показываем индикатор места вставки
        const rect = card.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        // Удаляем старые индикаторы
        card.querySelectorAll('.drag-indicator').forEach(el => el.remove());
        
        // Создаём новый индикатор (сверху или снизу)
        const indicator = document.createElement('div');
        indicator.className = 'drag-indicator';
        
        if (y < rect.height / 2) {
            card.parentNode.insertBefore(indicator, card);
        } else {
            card.parentNode.insertBefore(indicator, card.nextSibling);
        }
    }
}

function handleDragLeave(e) {
    const card = e.target.closest('.note-card');
    if (card) {
        card.classList.remove('drag-over');
        card.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    }
}

function handleDrop(e) {
    e.preventDefault();
    
    const targetCard = e.target.closest('.note-card');
    if (!targetCard) return;
    
    const targetId = parseInt(targetCard.dataset.id);
    if (targetId === draggedNoteId) return;
    
    const draggedNote = notes.find(n => n.id === draggedNoteId);
    const targetNote = notes.find(n => n.id === targetId);
    if (!draggedNote || !targetNote) return;
    
    // Проверяем: можно ли перетащить?
    if (draggedNote.pinned !== targetNote.pinned) {
        showToast('Нельзя перемещать закреплённые и незакреплённые заметки друг с другом');
        return;
    }
    
    // Определяем позицию вставки
    const rect = targetCard.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const insertBefore = y < rect.height / 2;
    
    // Перемещаем заметку
    const dragIndex = notes.findIndex(n => n.id === draggedNoteId);
    const targetIndex = notes.findIndex(n => n.id === targetId);
    
    if (dragIndex === -1 || targetIndex === -1) return;
    
    // Удаляем перетаскиваемую заметку
    const [note] = notes.splice(dragIndex, 1);
    
    // Вставляем на новое место
    const newIndex = insertBefore ? targetIndex : targetIndex + 1;
    notes.splice(newIndex, 0, note);
    
    // Сохраняем и перерисовываем
    saveNotes();
    renderNotes();
    
    showToast(`Заметка перемещена`);
    
    // Очищаем состояние
    document.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    document.querySelectorAll('.note-card.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    draggedNoteId = null;
    dragTargetId = null;
}
