// ============================================
// TAGS
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
                    
                    // ✅ Обновляем карточку
                    if (typeof updateNoteCard === 'function') {
                        updateNoteCard(currentNoteId);
                    } else {
                        renderNotes();
                    }
                    
                    showToast(`Ярлык "${trimmedTag}" добавлен`);
                } else {
                    showToast(`Ярлык "${trimmedTag}" уже существует`);
                }
            }
        } else {
            // Сначала сохраняем заметку через saveNoteSilent (создаст currentNoteId)
            if (typeof saveNoteSilent === 'function') {
                saveNoteSilent();
            }
            
            if (currentNoteId) {
                const note = notes.find(n => n.id === currentNoteId);
                if (note) {
                    note.tags = [trimmedTag];
                    saveNotes();
                    if (typeof updateNoteCard === 'function') {
                        updateNoteCard(currentNoteId);
                    } else {
                        renderNotes();
                    }
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
      renderNotes();
      showToast(`Ярлык "${tag}" удалён`);
    }
  }
}

function removeTagFromCard(noteId, tag, e) {
    e?.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (note) {
        const index = note.tags.indexOf(tag);
        if (index > -1) {
            note.tags.splice(index, 1);
            saveNotes();
            
            // ✅ Обновляем карточку
            if (typeof updateNoteCard === 'function') {
                updateNoteCard(noteId);
            } else {
                renderNotes();
            }
            
            showToast(`Ярлык "${tag}" удалён`);
        }
    }
}

// ============================================
// ФИЛЬТРАЦИЯ ПО ТЕГАМ
// ============================================

function filterByTag(tag, e) {
    e?.stopPropagation();
    tagFilter = tag;
    currentFilter = "all";
    
    // Снимаем выделение со всех пунктов навигации
    document.querySelectorAll(".nav-item").forEach((el) => 
        el.classList.remove("active")
    );
    
    // Подсвечиваем выбранный тег
    const tagItems = document.querySelectorAll("#tagList .nav-item");
    tagItems.forEach((el) => {
        const label = el.querySelector('.nav-label');
        if (label && label.textContent === tag) {
            el.classList.add("active");
        }
    });
    
    // Применяем фильтр
    applyTagFilter();
}

function clearTagFilter() {
    tagFilter = null;
    currentFilter = "all";
    
    document.querySelectorAll(".nav-item").forEach((el) => 
        el.classList.remove("active")
    );
    
    // Подсвечиваем "Все заметки"
    const allBtn = document.querySelector('.nav-item[data-filter="all"]');
    if (allBtn) allBtn.classList.add("active");
    
    applyTagFilter();
}

function applyTagFilter() {
    // Полная перерисовка с очисткой кэша
    if (typeof clearCardCache === 'function') {
        clearCardCache();
    }
    
    renderNotes();
    updateCounts();
}

// Фильтр по тегам встроен в getFilteredNotes (render-optimized.js)

function renderTags() {
    const container = document.getElementById('tagList');
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Собираем все теги
    const tagMap = new Map();
    notes.filter(n => !n.trashed && !n.archived).forEach(n => {
        n.tags.forEach(t => {
            tagMap.set(t, (tagMap.get(t) || 0) + 1);
        });
    });
    
    // Если тегов нет, ничего не показываем
    if (tagMap.size === 0) {
        return;
    }
    
    // Создаём элементы для каждого тега
    for (const [tag, count] of tagMap) {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        
        // SVG иконка
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

function renderTags() {
    const container = document.getElementById('tagList');
    container.innerHTML = '';
    
    const tagMap = new Map();
    notes.filter(n => !n.trashed && !n.archived).forEach(n => {
        n.tags.forEach(t => {
            tagMap.set(t, (tagMap.get(t) || 0) + 1);
        });
    });
    
    if (tagMap.size === 0) {
        return;
    }
    
    // Сортируем теги по популярности
    const sortedTags = Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1]);
    
    // Кнопка "Сбросить фильтр", если активен фильтр по тегу
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
    
    // Список тегов
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
