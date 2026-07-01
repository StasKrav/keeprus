// ============================================
// DRAG-AND-DROP В СТИЛЕ GOOGLE KEEP (ПЛАВНАЯ ВЕРСИЯ)
// ============================================

let dnd = {
    draggedId: null,
    element: null,
    clone: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    isDragging: false,
    targetId: null,
    insertBefore: null,
    originalIndex: -1,
    targetIndex: -1,
    initialRect: null,
    siblings: [],
    siblingPositions: []
};

function setupDragAndDrop() {
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    container.removeEventListener('mousedown', onDragStart);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    
    container.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
}

function onDragStart(e) {
    const card = e.target.closest('.note-card');
    if (!card) return;
    if (e.target.closest('button') || e.target.closest('.action-button') || 
        e.target.closest('.pin-icon') || e.target.closest('.note-tag') ||
        e.target.closest('.text-link')) return;
    
    const id = parseInt(card.dataset.id);
    if (isNaN(id)) return;
    
    const rect = card.getBoundingClientRect();
    dnd.initialRect = rect;
    dnd.draggedId = id;
    dnd.element = card;
    dnd.offsetX = e.clientX - rect.left;
    dnd.offsetY = e.clientY - rect.top;
    dnd.startX = e.clientX;
    dnd.startY = e.clientY;
    dnd.isDragging = false;
    
    const container = document.getElementById('notesContainer');
    dnd.siblings = Array.from(container.querySelectorAll('.note-card'));
    dnd.siblingPositions = dnd.siblings.map(el => el.getBoundingClientRect());
    
    card.style.cursor = 'grabbing';
    card.style.transition = 'box-shadow 0.2s ease, transform 0.2s ease';
    card.style.zIndex = '10';
    
    e.preventDefault();
}

function onDragMove(e) {
    if (!dnd.element) return;
    
    const dx = e.clientX - dnd.startX;
    const dy = e.clientY - dnd.startY;
    
    if (!dnd.isDragging) {
        if (Math.sqrt(dx*dx + dy*dy) > 5) {
            dnd.isDragging = true;
            
            dnd.clone = dnd.element.cloneNode(true);
            dnd.clone.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 1000;
                width: ${dnd.initialRect.width}px;
                height: ${dnd.initialRect.height}px;
                background: ${getComputedStyle(dnd.element).backgroundColor || '#fff'};
                border-radius: 8px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15);
                border: 1px solid var(--border-color);
                transform: rotate(0.5deg) scale(1.02);
                transition: none;
                opacity: 0.95;
            `;
            dnd.clone.style.left = (e.clientX - dnd.offsetX) + 'px';
            dnd.clone.style.top = (e.clientY - dnd.offsetY) + 'px';
            document.body.appendChild(dnd.clone);
            
            // Сохраняем исходную позицию элемента в DOM
            dnd.element._parent = dnd.element.parentNode;
            dnd.element._nextSibling = dnd.element.nextSibling;
            dnd.element._originalIndex = Array.from(dnd.element.parentNode.children).indexOf(dnd.element);
            
            dnd.element.style.opacity = '0.3';
            dnd.element.style.transform = 'scale(0.98)';
            
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        }
        return;
    }
    
    if (dnd.clone) {
        dnd.clone.style.left = (e.clientX - dnd.offsetX) + 'px';
        dnd.clone.style.top = (e.clientY - dnd.offsetY) + 'px';
    }
    
    document.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const targetCard = target ? target.closest('.note-card') : null;
    
    if (targetCard && targetCard !== dnd.element) {
        const targetId = parseInt(targetCard.dataset.id);
        if (targetId !== dnd.draggedId) {
            dnd.targetId = targetId;
            
            const rect = targetCard.getBoundingClientRect();
            const y = e.clientY - rect.top;
            dnd.insertBefore = y < rect.height / 2;
            
            const indicator = document.createElement('div');
            indicator.className = 'drag-indicator';
            indicator.style.cssText = `
                height: 2px;
                background: var(--primary-color);
                margin: 4px 0;
                border-radius: 1px;
                opacity: 0.6;
                transition: none;
            `;
            
            if (dnd.insertBefore) {
                targetCard.parentNode.insertBefore(indicator, targetCard);
            } else {
                targetCard.parentNode.insertBefore(indicator, targetCard.nextSibling);
            }
        }
    } else {
        dnd.targetId = null;
    }
}

function onDragEnd(e) {
    if (!dnd.element) {
        cleanup();
        return;
    }
    
    if (dnd.clone) {
        dnd.clone.remove();
        dnd.clone = null;
    }
    
    if (!dnd.isDragging) {
        cleanup();
        return;
    }
    
    if (dnd.targetId !== null) {
        const draggedNote = notes.find(n => n.id === dnd.draggedId);
        const targetNote = notes.find(n => n.id === dnd.targetId);
        
        if (draggedNote && targetNote) {
            if (draggedNote.pinned !== targetNote.pinned) {
                showToast('❌ Нельзя смешивать закреплённые и обычные заметки');
                cleanup();
                return;
            }
            
            const fromIndex = notes.findIndex(n => n.id === dnd.draggedId);
            const toIndex = notes.findIndex(n => n.id === dnd.targetId);
            
            if (fromIndex !== -1 && toIndex !== -1) {
                // Плавно перемещаем в массиве
                const [note] = notes.splice(fromIndex, 1);
                const newIndex = dnd.insertBefore ? toIndex : toIndex + 1;
                notes.splice(newIndex, 0, note);
                
                saveNotes();
                
                // 👇 ПЛАВНОЕ ОБНОВЛЕНИЕ БЕЗ ДЁРГАНИЯ
                updateNotesOrderSmooth(dnd.element, dnd.draggedId);
            }
        }
    }
    
    cleanup();
}

// ============================================
// ПЛАВНОЕ ОБНОВЛЕНИЕ ПОРЯДКА (БЕЗ МЕРЦАНИЯ)
// ============================================

function updateNotesOrderSmooth(draggedElement, draggedId) {
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    // Получаем карточки в правильном порядке
    const filtered = getFilteredNotes();
    const cardMap = new Map();
    
    // Собираем все существующие карточки
    Array.from(container.querySelectorAll('.note-card')).forEach(card => {
        const id = parseInt(card.dataset.id);
        cardMap.set(id, card);
    });
    
    // Создаем новый порядок
    const sortedCards = [];
    filtered.forEach(note => {
        const card = cardMap.get(note.id);
        if (card) {
            sortedCards.push(card);
        }
    });
    
    // Проверяем, изменился ли порядок
    const currentOrder = Array.from(container.querySelectorAll('.note-card'))
        .map(c => parseInt(c.dataset.id));
    const newOrder = sortedCards.map(c => parseInt(c.dataset.id));
    
    let needsReorder = false;
    if (currentOrder.length !== newOrder.length) {
        needsReorder = true;
    } else {
        for (let i = 0; i < currentOrder.length; i++) {
            if (currentOrder[i] !== newOrder[i]) {
                needsReorder = true;
                break;
            }
        }
    }
    
    if (!needsReorder) {
        // Восстанавливаем видимость
        document.querySelectorAll('.note-card').forEach(card => {
            card.style.opacity = '1';
            card.style.transform = '';
            card.style.transition = 'all 0.3s ease';
        });
        return;
    }
    
    // Определяем, куда переместился элемент
    const oldIndex = currentOrder.indexOf(draggedId);
    const newIndex = newOrder.indexOf(draggedId);
    
    // Если элемент переместился, используем плавную анимацию
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        // Создаём фрагмент с новым порядком
        const fragment = document.createDocumentFragment();
        
        // Добавляем все карточки в новом порядке
        sortedCards.forEach((card, index) => {
            // Убираем все трансформации
            card.style.transform = '';
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            fragment.appendChild(card);
        });
        
        // Заменяем содержимое
        container.innerHTML = '';
        container.appendChild(fragment);
        
        // 🎯 Плавно анимируем появление
        document.querySelectorAll('.note-card').forEach((card, i) => {
            // Задержка для плавности
            card.style.animationDelay = (i * 0.02) + 's';
            card.style.animation = 'cardAppear 0.3s ease forwards';
        });
    } else {
        // Простое обновление
        const fragment = document.createDocumentFragment();
        sortedCards.forEach(card => {
            card.style.opacity = '1';
            card.style.transform = '';
            card.style.transition = 'all 0.3s ease';
            fragment.appendChild(card);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    // Обновляем кэш
    if (typeof clearCardCache === 'function') {
        clearCardCache();
    }
    
    // Перерендерим без мерцания (но не пересоздаём карточки)
    setTimeout(() => {
        // Обновляем только состояние (без пересоздания DOM)
        const filteredNotes = getFilteredNotes();
        filteredNotes.forEach(note => {
            const card = cardMap.get(note.id);
            if (card) {
                // Обновляем данные, но не пересоздаём
                card.dataset.id = note.id;
                // Обновляем классы (цвет, закрепление)
                card.className = `note-card ${note.color} ${note.pinned ? 'pinned' : ''}`;
            }
        });
    }, 50);
}

function cleanup() {
    if (dnd.clone) {
        dnd.clone.remove();
        dnd.clone = null;
    }
    
    document.querySelectorAll('.note-card').forEach(c => {
        c.style.opacity = '1';
        c.style.transform = '';
        c.style.transition = 'all 0.3s ease';
        c.style.cursor = '';
        c.style.zIndex = '';
        c.style.boxShadow = '';
        c.style.animation = '';
        c.style.animationDelay = '';
    });
    
    document.querySelectorAll('.drag-indicator').forEach(el => el.remove());
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    dnd.element = null;
    dnd.draggedId = null;
    dnd.isDragging = false;
    dnd.targetId = null;
    dnd.insertBefore = null;
    dnd.originalIndex = -1;
    dnd.targetIndex = -1;
    dnd.initialRect = null;
    dnd.siblings = [];
    dnd.siblingPositions = [];
}

// ============================================
// СТИЛИ ДЛЯ ПЛАВНОГО DND
// ============================================

const dndStyles = document.createElement('style');
dndStyles.textContent = `
    .note-card {
        cursor: grab;
        user-select: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        will-change: transform, opacity;
        animation: none !important;
    }
    
    .note-card:active {
        cursor: grabbing;
    }
    
    .note-card.dragging {
        opacity: 0.3;
        transform: scale(0.98);
        transition: all 0.2s ease;
    }
    
    .drag-indicator {
        height: 2px;
        background: var(--primary-color);
        margin: 4px 0;
        border-radius: 1px;
        opacity: 0.6;
        transition: none;
        animation: indicatorPulse 0.8s ease-in-out infinite;
    }
    
    @keyframes indicatorPulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
    }
    
    /* Плавное появление карточек */
    @keyframes cardAppear {
        from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    /* Плавное исчезновение */
    .note-card.removing {
        animation: cardDisappear 0.25s ease-in forwards;
    }
    
    @keyframes cardDisappear {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.95);
        }
    }
`;
document.head.appendChild(dndStyles);

// ============================================
// ПЕРЕХВАТ renderNotes ДЛЯ ПЛАВНОСТИ
// ============================================

const origRender = window.renderNotes;
if (origRender) {
    window.renderNotes = function(...args) {
        origRender.apply(this, args);
        setTimeout(setupDragAndDrop, 150);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupDragAndDrop, 300);
});

console.log('✅ Плавный DND в стиле Google Keep');
