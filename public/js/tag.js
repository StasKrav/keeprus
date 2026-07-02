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
