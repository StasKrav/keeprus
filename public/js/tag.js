// ============================================
// TAGS
// ============================================

function addTagToNote() {
  showPromptDialog((tag) => {
    if (!tag || tag.trim() === "") return;
    const trimmedTag = tag.trim();

    if (currentNoteId) {
      const note = notes.find((n) => n.id === currentNoteId);
      if (note) {
        if (!note.tags.includes(trimmedTag)) {
          note.tags.push(trimmedTag);
          saveNotes();
          renderNotes();
          showToast(`Ярлык "${trimmedTag}" добавлен`);
        } else {
          showToast(`Ярлык "${trimmedTag}" уже существует`);
        }
      }
    } else {
      // For new note, we'll store tags in a temporary array
      // Actually let's just save the note with the tag
      const title =
        document.getElementById("noteTitle").value.trim() || "Без названия";
      const content = document.getElementById("noteContent").value.trim() || "";

      const newNote = {
        id: Date.now(),
        title: title,
        content: content,
        color: currentColor,
        tags: [trimmedTag],
        pinned: isPinned,
        archived: isArchived,
        trashed: false,
        date:
          new Date().toLocaleDateString("ru-RU") +
          " " +
          new Date().toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
      };
      notes.unshift(newNote);
      currentNoteId = newNote.id;
      saveNotes();
      renderNotes();
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
  const note = notes.find((n) => n.id === noteId);
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

function filterByTag(tag, e) {
    e?.stopPropagation();
    tagFilter = tag;
    currentFilter = "all";
    
    // Снимаем выделение со всех пунктов
    document.querySelectorAll(".nav-item").forEach((el) => 
        el.classList.remove("active")
    );
    
    // Находим и подсвечиваем ярлык в списке
    const tagItems = document.querySelectorAll("#tagList .nav-item");
    tagItems.forEach((el) => {
        const label = el.querySelector('.nav-label');
        if (label && label.textContent === tag) {
            el.classList.add("active");
        }
    });
    
    renderNotes();
    showToast(`Фильтр: ${tag}`);
}

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
