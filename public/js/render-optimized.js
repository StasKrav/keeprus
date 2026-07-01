// ============================================
// ОПТИМИЗИРОВАННЫЙ РЕНДЕР С КЭШИРОВАНИЕМ
// ============================================

const cardCache = new Map();
let renderedIds = new Set();
let needsCountUpdate = false;

// ============================================
// ФИЛЬТРАЦИЯ ЗАМЕТОК
// ============================================

function getFilteredNotes() {
  let filtered = notes.filter((n) => !n.trashed);

  if (currentFilter === "pinned") {
    filtered = filtered.filter((n) => n.pinned);
  } else if (currentFilter === "archive") {
    filtered = filtered.filter((n) => n.archived);
  } else if (currentFilter === "trash") {
    filtered = notes.filter((n) => n.trashed);
  } else {
    filtered = filtered.filter((n) => !n.archived);
  }

  // Search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(term) ||
        n.content.toLowerCase().includes(term) ||
        n.tags.some((t) => t.toLowerCase().includes(term)),
    );
  }

  // Tag filter
  if (tagFilter) {
    filtered = filtered.filter((n) => n.tags.includes(tagFilter));
  }

  // Color filter
  if (currentColorFilter) {
    filtered = filtered.filter((n) => {
      const noteColor = n.color || 'color-default';
      return noteColor === currentColorFilter;
    });
  }

  return filtered;
}

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРА
// ============================================

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРА
// ============================================

function renderNotes(keepScroll = true) {
    const container = document.getElementById("notesContainer");
    if (!container) return;

    const filtered = getFilteredNotes();

    // Empty state
    if (filtered.length === 0) {
        cardCache.clear();
        renderedIds.clear();
        
        // === ДЛЯ КОРЗИНЫ ПОКАЗЫВАЕМ ОСОБЫЙ EMPTY-STATE ===
        if (currentFilter === 'trash') {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg width="64" height="64" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                                        <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                                        <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                                        <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                                        <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                                    </svg>
                    <h2>Корзина пуста</h2>
                    <p>Удаленные заметки будут здесь</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v4"/>
                    <path d="M12 18v4"/>
                    <path d="M4.93 4.93l2.83 2.83"/>
                    <path d="M16.24 16.24l2.83 2.83"/>
                    <path d="M2 12h4"/>
                    <path d="M18 12h4"/>
                    <path d="M4.93 19.07l2.83-2.83"/>
                    <path d="M16.24 7.76l2.83-2.83"/>
                </svg>
                <h2>Нет заметок</h2>
                <p>Создайте новую заметку, нажав на кнопку +</p>
            </div>
        `;
        return;
    }

    // === ЕСЛИ МЫ В КОРЗИНЕ И ЕСТЬ ЗАМЕТКИ — ПОКАЗЫВАЕМ КНОПКУ "ОЧИСТИТЬ" ===
    if (currentFilter === 'trash') {
        // Проверяем, есть ли уже кнопка очистки
        let clearBtn = document.getElementById('trashClearBtnInline');
        if (!clearBtn) {
            clearBtn = document.createElement('div');
            clearBtn.id = 'trashClearBtnInline';
            clearBtn.className = 'trash-clear-inline';
            clearBtn.innerHTML = `
                <span class="trash-clear-text" onclick="clearTrash()">Очистить корзину</span>
            `;
            // Вставляем перед контейнером заметок
            container.parentNode.insertBefore(clearBtn, container);
        }
        clearBtn.style.display = 'block';
    } else {
        // Убираем кнопку, если не в корзине
        const clearBtn = document.getElementById('trashClearBtnInline');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    }

    let scrollTop = 0;
    if (keepScroll) {
        scrollTop = container.scrollTop || window.scrollY;
    }

    const newIds = new Set(filtered.map(n => n.id));

    // Удаляем карточки, которых больше нет
    const toRemove = [];
    for (const id of renderedIds) {
        if (!newIds.has(id)) {
            const element = cardCache.get(id);
            if (element && element.parentNode) {
                toRemove.push({ id, element });
            }
        }
    }

    for (const { id, element } of toRemove) {
        element.remove();
        cardCache.delete(id);
        element._cleanup?.();
    }

    // Добавляем/обновляем карточки
    const fragment = document.createDocumentFragment();
    const cardsToInsert = [];

    filtered.forEach((note) => {
        let element = cardCache.get(note.id);

        if (!element) {
            element = createNoteElement(note);
            cardCache.set(note.id, element);
            cardsToInsert.push({ element, note });
        } else {
            // Полностью пересоздаём карточку при обновлении
            const newElement = createNoteElement(note);
            element.parentNode?.replaceChild(newElement, element);
            cardCache.set(note.id, newElement);
            element = newElement;
        }

        fragment.appendChild(element);
    });

    if (cardsToInsert.length > 0) {
        container.innerHTML = '';
        container.appendChild(fragment);
    } else {
        const sortedElements = filtered
            .map(n => cardCache.get(n.id))
            .filter(el => el !== undefined);

        let needsReorder = false;
        const currentChildren = Array.from(container.children);
        
        if (currentChildren.length !== sortedElements.length) {
            needsReorder = true;
        } else {
            for (let i = 0; i < currentChildren.length; i++) {
                if (currentChildren[i] !== sortedElements[i]) {
                    needsReorder = true;
                    break;
                }
            }
        }

        if (needsReorder) {
            container.innerHTML = '';
            sortedElements.forEach(el => container.appendChild(el));
        }
    }

    renderedIds = newIds;

    if (keepScroll && scrollTop > 0) {
        if (container.scrollTop !== undefined) {
            container.scrollTop = scrollTop;
        } else {
            window.scrollTo(0, scrollTop);
        }
    }

    if (needsCountUpdate) {
        updateCounts();
        needsCountUpdate = false;
    }

    // Обновляем статистику, если она открыта
    if (typeof updateStatsIfVisible === 'function') {
        updateStatsIfVisible();
    }

    if (typeof setupDragAndDrop === 'function') {
        setTimeout(setupDragAndDrop, 100);
    }
}

// ============================================
// ОБНОВЛЕНИЕ ОДНОЙ КАРТОЧКИ (ПОЛНОЕ ПЕРЕСОЗДАНИЕ)
// ============================================

function updateNoteCard(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const oldElement = cardCache.get(noteId);
    if (!oldElement) {
        addNoteCard(note);
        return;
    }

    // Полностью пересоздаём карточку
    const newElement = createNoteElement(note);
    
    // Заменяем старую карточку на новую
    oldElement.parentNode.replaceChild(newElement, oldElement);
    
    // Обновляем кэш
    cardCache.set(noteId, newElement);
    
    // Обновляем счётчики
    updateCounts();
}

// ============================================
// ДОБАВЛЕНИЕ НОВОЙ КАРТОЧКИ
// ============================================

function addNoteCard(note) {
    const container = document.getElementById("notesContainer");
    if (!container) return;

    if (cardCache.has(note.id)) {
        updateNoteCard(note.id);
        return;
    }

    const element = createNoteElement(note);
    cardCache.set(note.id, element);
    renderedIds.add(note.id);

    const filtered = getFilteredNotes();
    const index = filtered.findIndex(n => n.id === note.id);
    
    if (index === -1) return;

    let beforeElement = null;
    for (let i = index + 1; i < filtered.length; i++) {
        const nextId = filtered[i].id;
        const nextEl = cardCache.get(nextId);
        if (nextEl && nextEl.parentNode) {
            beforeElement = nextEl;
            break;
        }
    }

    if (beforeElement) {
        container.insertBefore(element, beforeElement);
    } else {
        container.appendChild(element);
    }

    updateCounts();
}

// ============================================
// УДАЛЕНИЕ КАРТОЧКИ
// ============================================

function removeNoteCard(noteId) {
    const element = cardCache.get(noteId);
    if (element && element.parentNode) {
        element.remove();
    }
    cardCache.delete(noteId);
    renderedIds.delete(noteId);
    updateCounts();
}

// ============================================
// ОБНОВЛЕНИЕ ЭЛЕМЕНТОВ (ДЛЯ СОВМЕСТИМОСТИ)
// ============================================

function updatePinIcon(element, isPinned) {
    const pinIcon = element.querySelector('.pin-icon');
    if (pinIcon) {
        const path = pinIcon.querySelector('path');
        if (path) {
            path.setAttribute('fill', isPinned ? 'currentColor' : 'none');
        }
    }
}

function updateTags(element, note) {
    const tagsContainer = element.querySelector('.note-tags');
    if (!tagsContainer) return;

    if (!note.tags || note.tags.length === 0) {
        tagsContainer.innerHTML = '';
        tagsContainer.style.display = 'none';
        return;
    }

    tagsContainer.style.display = 'flex';
    tagsContainer.innerHTML = note.tags.map(tag => `
        <span class="note-tag" onclick="filterByTag('${escapeHtml(tag)}', event)">
            <span class="tag-text">${escapeHtml(tag)}</span>
            <span class="tag-remove" onclick="removeTagFromCard(${note.id}, '${escapeHtml(tag)}', event)">&times;</span>
        </span>
    `).join('');
}

function updateReminder(element, note) {
    const existingReminder = element.querySelector('.note-reminder');
    
    if (note.reminder) {
        if (existingReminder) {
            const textEl = existingReminder.querySelector('.reminder-text');
            if (textEl) {
                textEl.textContent = `${note.reminder.date} ${note.reminder.time}`;
            }
        } else {
            const footer = element.querySelector('.note-footer');
            if (footer) {
                const reminderHtml = `
                    <div class="note-reminder">
                        <svg width="18" height="18" viewBox="0 0 416 501" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round">
                            <path d="M112,213 C144,117 272,117 304,213"/>
                            <path d="M112,208 L112,368"/>
                            <path d="M304,208 L304,368"/>
                            <path d="M80,368 L336,368"/>
                            <path d="M208,80 L208,112"/>
                            <path d="M176,400 C196,421 223,419 240,400"/>
                        </svg>
                        <span class="reminder-text">${note.reminder.date} ${note.reminder.time}</span>
                        <button class="reminder-delete" onclick="event.stopPropagation(); removeReminderFromCard(${note.id})" title="Удалить напоминание">✕</button>
                    </div>
                `;
                footer.insertAdjacentHTML('afterbegin', reminderHtml);
            }
        }
    } else {
        if (existingReminder) {
            existingReminder.remove();
        }
    }
}

function updateActionButtons(element, note) {
    const isTrash = currentFilter === 'trash';
    const actionsContainer = element.querySelector('.note-actions');
    if (!actionsContainer) return;

    actionsContainer.innerHTML = getActionButtonsHTML(note, isTrash);
}

function getActionButtonsHTML(note, isTrash) {
    if (isTrash) {
        return `
            <button class="action-button" onclick="restoreNote(${note.id}, event)">
                <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M258,218 L258,346" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M255,217 L191,281" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M260,219 L324,283" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                </svg>
            </button>
            <button class="action-button" onclick="deletePermanently(${note.id}, event)">
                <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M208,240 L304,336" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M304,240 L208,336" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                </svg>
            </button>
        `;
    }

    return `
        <button class="action-button" onclick="changeNoteColor(${note.id}, event)">
            <svg width="20" height="20" viewBox="0 0 608 576" xmlns="http://www.w3.org/2000/svg">
                <path d="M272,80 C432,80 528,176 432,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M272,80 C176,80 80,144 80,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M304,368 L304,496" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M304,368 L432,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <circle cx="308" cy="171" r="21.377558326431952" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                <circle cx="400" cy="240" r="20.591260281974" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                <circle cx="193" cy="209" r="23.021728866442675" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                <circle cx="162" cy="323" r="22.203603311174515" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                <path d="M80,272 C80,368 176,496 304,496" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
            </svg>
        </button>
        <button class="action-button" onclick="archiveNote(${note.id}, event)" title="${note.archived ? 'Разархивировать' : 'Архивировать'}">
            ${note.archived ? `
                <svg width="20" height="20" viewBox="0 0 480 416">
                    <path d="M80,336 L400,336" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M80,336 L80,304" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M80,304 L80,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M400,336 L400,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M240,240 L240,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M240,80 L176,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M240,80 L304,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                </svg>
            ` : `
                <svg width="20" height="20" viewBox="0 0 416 352" xmlns="http://www.w3.org/2000/svg">
                    <path d="M208,80 L208,208" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M144,144 L208,208" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M208,208 L272,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M80,272 L336,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M336,272 L336,112" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M80,112 L80,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                </svg>
            `}
        </button>
        <button class="action-button" onclick="showReminderModal(${note.id}, event)" title="Напоминание">
            <svg width="24" height="24" viewBox="0 0 416 501">
                <path d="M112,213 C144,117 272,117 304,213" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M112,208 L112,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M304,208 L304,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M80,368 L336,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M208,80 L208,112" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M176,400 C196,421 223,419 240,400" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
            </svg>
        </button>
        <button class="action-button" onclick="deleteNote(${note.id}, event)">
            <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
            </svg>
        </button>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function clearCardCache() {
    cardCache.clear();
    renderedIds.clear();
}

// Экспорт
window.getFilteredNotes = getFilteredNotes;
window.renderNotes = renderNotes;
window.updateNoteCard = updateNoteCard;
window.addNoteCard = addNoteCard;
window.removeNoteCard = removeNoteCard;
window.clearCardCache = clearCardCache;
window.escapeHtml = escapeHtml;

console.log('✅ Оптимизированный рендер загружен');

// ============================================
// ПОДДЕРЖКА ПРИНУДИТЕЛЬНОГО ОБНОВЛЕНИЯ
// ============================================

// Переопределяем updateNoteCard для совместимости
const originalUpdateNoteCard = window.updateNoteCard;
window.updateNoteCard = function(noteId) {
    // Если есть forceUpdateNoteCard, используем её
    if (typeof forceUpdateNoteCard === 'function') {
        forceUpdateNoteCard(noteId);
    } else {
        // Fallback
        if (originalUpdateNoteCard) {
            originalUpdateNoteCard(noteId);
        } else {
            renderNotes();
        }
    }
};

console.log('✅ Принудительное обновление карточек добавлено');
