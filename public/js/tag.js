// ============================================
// TAGS (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ============================================

function addTagToNote() {
    showPromptDialog((tag) => {
        if (!tag || tag.trim() === "") return;
        const trimmedTag = tag.trim();

        if (currentNoteId) {
            const note = notes.find(n => n.id === currentNoteId);
            if (note) {
                if (!note.tags.includes(trimmedTag)) {
                    note.tags.push(trimmedTag);
                    saveNotes();
                    
                    // ✅ ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ КАРТОЧКУ
                    forceUpdateNoteCard(currentNoteId);
                    
                    showToast(`Ярлык "${trimmedTag}" добавлен`);
                } else {
                    showToast(`Ярлык "${trimmedTag}" уже существует`);
                }
            }
        } else {
            if (typeof saveNoteSilent === 'function') {
                saveNoteSilent();
            }
            
            if (currentNoteId) {
                const note = notes.find(n => n.id === currentNoteId);
                if (note) {
                    note.tags = [trimmedTag];
                    saveNotes();
                    forceUpdateNoteCard(currentNoteId);
                }
            }
            
            showToast(`Ярлык "${trimmedTag}" добавлен к новой заметке`);
            closeEditor();
        }
    });
}

function removeTagFromNote(tag, e) {
    e?.stopPropagation();
    if (!currentNoteId) {
        showToast("Сначала сохраните заметку");
        return;
    }
    const note = notes.find((n) => n.id === currentNoteId);
    if (note) {
        const index = note.tags.indexOf(tag);
        if (index > -1) {
            note.tags.splice(index, 1);
            saveNotes();
            
            // ✅ ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ
            forceUpdateNoteCard(currentNoteId);
            
            showToast(`Ярлык "${tag}" удалён`);
        }
    }
}

function removeTagFromCard(noteId, tag, e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const index = note.tags.indexOf(tag);
    if (index === -1) return;
    
    note.tags.splice(index, 1);
    saveNotes();
    
    // Принудительное обновление
    if (typeof forceUpdateNoteCard === 'function') {
        forceUpdateNoteCard(noteId);
    } else {
        renderNotes();
    }
    
    showToast(`Ярлык "${tag}" удалён`);
}

// ============================================
// ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ КАРТОЧКИ
// ============================================

function forceUpdateNoteCard(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // 1. Удаляем из кэша
    if (typeof cardCache !== 'undefined' && cardCache) {
        cardCache.delete(noteId);
    }
    
    // 2. Удаляем старую карточку из DOM
    const oldCard = document.querySelector(`.note-card[data-id="${noteId}"]`);
    if (oldCard) {
        oldCard.remove();
    }
    
    // 3. Создаём новую карточку
    const newCard = createNoteElement(note);
    
    // 4. Вставляем на правильное место
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    // Находим место для вставки
    const filtered = getFilteredNotes();
    const index = filtered.findIndex(n => n.id === noteId);
    
    if (index === -1) {
        // Если заметка не в текущем фильтре, просто добавляем в конец
        container.appendChild(newCard);
    } else {
        // Вставляем перед следующей карточкой
        let inserted = false;
        for (let i = index + 1; i < filtered.length; i++) {
            const nextId = filtered[i].id;
            const nextCard = document.querySelector(`.note-card[data-id="${nextId}"]`);
            if (nextCard) {
                container.insertBefore(newCard, nextCard);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            container.appendChild(newCard);
        }
    }
    
    // 5. Обновляем кэш
    if (typeof cardCache !== 'undefined' && cardCache) {
        cardCache.set(noteId, newCard);
    }
    
    // 6. Перезапускаем DND
    if (typeof setupDragAndDrop === 'function') {
        setTimeout(setupDragAndDrop, 100);
    }
}

// ============================================
// ФИЛЬТРАЦИЯ ПО ТЕГАМ
// ============================================

function filterByTag(tag, e) {
    if (e) {
        e.stopPropagation();
        // Предотвращаем двойной вызов
        if (e.target && e.target.closest('.tag-remove')) {
            return;
        }
    }
    
    // Если клик по крестику — игнорируем
    if (e && e.target && e.target.classList.contains('tag-remove')) {
        return;
    }
    
    tagFilter = tag;
    currentFilter = "all";
    
    document.querySelectorAll(".nav-item").forEach((el) => 
        el.classList.remove("active")
    );
    
    const tagItems = document.querySelectorAll("#tagList .nav-item");
    tagItems.forEach((el) => {
        const label = el.querySelector('.nav-label');
        if (label && label.textContent === tag) {
            el.classList.add("active");
        }
    });
    
    applyTagFilter();
}

function clearTagFilter() {
    tagFilter = null;
    currentFilter = "all";
    
    document.querySelectorAll(".nav-item").forEach((el) => 
        el.classList.remove("active")
    );
    
    const allBtn = document.querySelector('.nav-item[data-filter="all"]');
    if (allBtn) allBtn.classList.add("active");
    
    applyTagFilter();
}

function applyTagFilter() {
    if (typeof clearCardCache === 'function') {
        clearCardCache();
    }
    
    renderNotes();
    updateCounts();
}

function renderTags() {
    const container = document.getElementById('tagList');
    if (!container) return;
    
    container.innerHTML = '';
    
    const tagMap = new Map();
    notes.filter(n => !n.trashed && !n.archived).forEach(n => {
        // ✅ ЗАЩИТА ОТ UNDEFINED
        if (!n.tags || !Array.isArray(n.tags)) return;
        n.tags.forEach(t => {
            if (t && typeof t === 'string') {
                tagMap.set(t, (tagMap.get(t) || 0) + 1);
            }
        });
    });
    
    if (tagMap.size === 0) {
        return;
    }
    
    const sortedTags = Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1]);
    
    if (tagFilter) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'nav-item tag-clear-btn';
        clearBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span class="nav-label">Сбросить фильтр</span>
        `;
        clearBtn.onclick = clearTagFilter;
        container.appendChild(clearBtn);
    }
    
    for (const [tag, count] of sortedTags) {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        if (tagFilter === tag) {
            btn.classList.add('active');
        }
        
        btn.innerHTML = `
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83L12 2z"/>
                <path d="M7 7h.01"/>
            </svg>
            <span class="nav-label">${tag}</span>
            <span class="tag-count">${count}</span>
        `;
        
        btn.onclick = () => filterByTag(tag);
        container.appendChild(btn);
    }
}

// Экспортируем новую функцию
window.forceUpdateNoteCard = forceUpdateNoteCard;

// ============================================
// ВСПЛЫВАЮЩИЙ СПИСОК ТЭГОВ
// ============================================

let tagsPopup = null;

function showTagsPopup(noteId, event) {
    event.stopPropagation();
    
    // Закрываем старый попап
    closeTagsPopup();
    
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.tags || note.tags.length === 0) return;
    
    // Создаём попап
    const popup = document.createElement('div');
    popup.className = 'tags-popup';
    popup.id = 'tagsPopup';
    
    // Содержимое
    popup.innerHTML = note.tags.map(tag => `
        <div class="tags-popup-item" onclick="event.stopPropagation(); filterByTag('${escapeHtml(tag)}', event)">
            <span class="tag-color" style="background: ${getTagColor(tag)};"></span>
            <span class="tag-name">${escapeHtml(tag)}</span>
            <span class="tag-remove-popup" onclick="event.stopPropagation(); removeTagFromCard(${noteId}, '${escapeHtml(tag)}', event)">×</span>
        </div>
    `).join('');
    
    // Позиционируем
    const rect = event.target.getBoundingClientRect();
    const popupWidth = 200;
    let left = rect.left;
    let top = rect.bottom + 4;
    
    // Не выходим за экран
    if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
    }
    if (top + 200 > window.innerHeight - 10) {
        top = rect.top - 200 - 4;
    }
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    
    document.body.appendChild(popup);
    tagsPopup = popup;
    
    // Закрытие по клику вне
    setTimeout(() => {
        document.addEventListener('click', closeTagsPopupHandler, { once: true });
    }, 10);
}

function closeTagsPopupHandler(e) {
    if (e && e.target.closest && e.target.closest('.tags-popup')) return;
    closeTagsPopup();
}

function closeTagsPopup() {
    if (tagsPopup) {
        tagsPopup.remove();
        tagsPopup = null;
    }
    document.removeEventListener('click', closeTagsPopupHandler);
}

function getTagColor(tag) {
    // Генерируем цвет на основе текста тэга
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#1a73e8', '#34a853', '#fbbc04', '#ea4335', 
        '#9c27b0', '#00acc1', '#ff6f00', '#d81b60',
        '#4527a0', '#00695c', '#bf360c', '#4a148c'
    ];
    return colors[Math.abs(hash) % colors.length];
}

// Обновляем функцию создания тэгов в карточке
// ============================================
// ТЭГИ В ОДНУ СТРОКУ С УМНЫМ ОБРЕЗАНИЕМ
// ============================================

function createTagsWithMore(note) {
    if (!note.tags || note.tags.length === 0) return '';
    
    const MAX_VISIBLE_TAGS = 3;      // Максимум тэгов
    const MAX_TAG_WIDTH = 80;        // Максимальная ширина тэга в пикселях
    
    let html = '<div class="note-tags">';
    
    // Сначала проверяем, сколько тэгов поместится
    let visibleCount = 0;
    let totalWidth = 0;
    const tagWidths = [];
    
    // Измеряем ширину каждого тэга (приблизительно)
    note.tags.forEach(tag => {
        // Приблизительная ширина: длина * 7px + отступы
        const approxWidth = Math.min(tag.length * 7 + 20, MAX_TAG_WIDTH);
        tagWidths.push(approxWidth);
    });
    
    // Считаем, сколько тэгов поместится (учитывая кнопку "+N")
    const containerWidth = 200; // Приблизительная ширина контейнера тэгов
    let availableWidth = containerWidth - 30; // -30 для кнопки "+N"
    
    for (let i = 0; i < note.tags.length; i++) {
        const width = tagWidths[i];
        if (totalWidth + width < availableWidth && i < MAX_VISIBLE_TAGS) {
            totalWidth += width + 4; // +4 на gap
            visibleCount++;
        } else {
            break;
        }
    }
    
    // Если помещается меньше 1 тэга - показываем хотя бы 1
    if (visibleCount === 0 && note.tags.length > 0) {
        visibleCount = 1;
    }
    
    // Показываем видимые тэги
    const visibleTags = note.tags.slice(0, visibleCount);
    const hiddenTags = note.tags.slice(visibleCount);
    
    visibleTags.forEach(tag => {
        // Укорачиваем длинные тэги
        let displayTag = tag;
        if (tag.length > 12) {
            displayTag = tag.slice(0, 10) + '…';
        }
        
        html += `
            <span class="note-tag" data-tag="${escapeHtml(tag)}" title="${escapeHtml(tag)}">
                <span class="tag-text" onclick="filterByTag('${escapeHtml(tag)}', event)">${escapeHtml(displayTag)}</span>
                <span class="tag-remove" onclick="event.stopPropagation(); removeTagFromCard(${note.id}, '${escapeHtml(tag)}', event)">×</span>
            </span>
        `;
    });
    
    // Если есть скрытые тэги - показываем кнопку "+N"
    if (hiddenTags.length > 0) {
        html += `
            <button class="note-tags-more" onclick="showTagsPopup(${note.id}, event)">
                +${hiddenTags.length}
            </button>
        `;
    }
    
    html += '</div>';
    return html;
}

// ============================================
// ОБНОВЛЕНИЕ ПОХОЖИХ ЗАМЕТОК
// ============================================

function updateSimilarNotes(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const card = document.querySelector(`.note-card[data-id="${noteId}"]`);
    if (!card) return;
    
    // Находим блок похожих заметок
    const similarBlock = card.querySelector('.note-similar');
    if (!similarBlock) return;
    
    // Пересоздаём блок
    const newSimilarHtml = renderSimilarNotesBlock(note);
    if (newSimilarHtml) {
        similarBlock.outerHTML = newSimilarHtml;
    } else {
        similarBlock.remove();
    }
}

// Вызывать при добавлении/удалении заметок
window.updateSimilarNotes = updateSimilarNotes;
window.createTagsWithMore = createTagsWithMore;
window.showTagsPopup = showTagsPopup;
window.closeTagsPopup = closeTagsPopup;
