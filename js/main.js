// ============================================
// DATA LAYER
// ============================================
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



let notes = [];
let currentFilter = "all";
let currentView = "grid";
let currentNoteId = null;
let currentColor = "color-default";
let isPinned = false;
let isArchived = false;
let isMarkdownMode = false;
let hasUnsavedChanges = false;
let searchTerm = "";
let tagFilter = null;
let deletedNotes = [];

// Safe localStorage wrapper (handles private browsing, quota exceeded, etc.)
function storageGet(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (e) {
    console.warn("localStorage unavailable (getItem):", e.message);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn("localStorage unavailable (setItem):", e.message);
    return false;
  }
}

// Load notes from localStorage
function loadNotes() {
  const saved = storageGet("material_keep_notes");
  if (saved) {
    try {
      notes = JSON.parse(saved);
      return;
    } catch (e) {
      console.error("Error loading notes:", e);
    }
  }

  // Default notes if none saved
  notes = [
    {
      id: Date.now() - 100000,
      title: "Добро пожаловать в Keeprus!",
      content:
        "• Кликните на заметку чтобы редактировать\n• Используйте поиск для фильтрации\n• Добавляйте ярлыки и цвета",
      color: "color-yellow",
      tags: ["Вступление"],
      pinned: true,
      archived: false,
      trashed: false,
      date: new Date().toLocaleDateString("ru-RU"),
    },
    {
      id: Date.now() - 50000,
      title: "Идеи для проекта",
      content: "Изучить Material Design 3, создать компоненты, анимации",
      color: "color-blue",
      tags: ["Работа", "Дизайн"],
      pinned: true,
      archived: false,
      trashed: false,
      date: new Date(Date.now() - 86400000).toLocaleDateString("ru-RU"),
    },
    {
      id: Date.now() - 20000,
      title: "Книги для прочтения",
      content: "1. Atomic Habits\n2. Deep Work\n3. Design of Everyday Things",
      color: "color-green",
      tags: ["Образование"],
      pinned: false,
      archived: false,
      trashed: false,
      date: new Date(Date.now() - 172800000).toLocaleDateString("ru-RU"),
    },
  ];
  saveNotes();
}

function saveNotes() {
  storageSet("material_keep_notes", JSON.stringify(notes));
  updateCounts();
}

function updateLogoColors(theme) {
    const svg = document.querySelector('.logo svg');
    if (!svg) return;
    
    // Находим все элементы с fill
    const elements = svg.querySelectorAll('path, circle');
    
    // Выбираем нужный градиент
    const gradientId = theme === 'dark' ? 'logoGradDark' : 'logoGradLight';
    
    // Применяем градиент ко всем элементам
    elements.forEach(el => {
        el.setAttribute('fill', `url(#${gradientId})`);
    });
}


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


// ============================================
// RENDER ENGINE
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

  return filtered;
}

function renderNotes() {
  const container = document.getElementById("notesContainer");
  const filtered = getFilteredNotes();

  if (filtered.length === 0) {
    container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
            ${currentFilter === 'trash' ? `
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                </svg>
            ` : `
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
            `}
            <h2>${currentFilter === 'trash' ? 'Корзина пуста' : 'Нет заметок'}</h2>
            <p>${currentFilter === 'trash' ? 'Удаленные заметки будут здесь' : 'Создайте новую заметку, нажав на кнопку +'}</p>
        </div>
    `;
    return;
  }

  container.innerHTML = "";

  // Show pinned first (except in pinned or trash view)
  let sorted = [...filtered];
  if (currentFilter !== "pinned" && currentFilter !== "trash") {
    sorted.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.id - a.id;
    });
  } else {
    sorted.sort((a, b) => b.id - a.id);
  }

  sorted.forEach((note) => {
    container.appendChild(createNoteElement(note));
  });

  // Update title
  const titleMap = {
    all: "Все заметки",
    pinned: "Закрепленные",
    archive: "Архив",
    trash: "Корзина",
  };
  const title = document.getElementById("notesTitle");
  title.innerHTML = `${titleMap[currentFilter] || "Все заметки"} <span class="notes-count">(${filtered.length})</span>`;
}

// ============================================
// MARKDOWN PARSER
// ============================================

function escapeHtml(str) {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (!text) return "";

  // Escape HTML to prevent XSS — do this FIRST, before any tag injection
  let html = escapeHtml(text);

  // Headers: ## Title or # Title
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Code blocks: ```code```
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // Ordered lists: 1. item — process BEFORE unordered to avoid <li> conflicts
  html = html.replace(/^\d+\. (.+)$/gm, "<oli>$1</oli>");
  // Wrap consecutive <oli> in <ol>, converting markers to real <li>
  html = html.replace(/(<oli>[\s\S]*?<\/oli>(\n?))+/g, (match) => {
    return '<ol>' + match.replace(/<\/?oli>/g, (m) => m === '<oli>' ? '<li>' : '</li>') + '</ol>';
  });

  // Unordered lists: - item or * item
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>(\n?))+/g, (match) => `<ul>${match}</ul>`);

  // Blockquotes: > text
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Horizontal rule: --- or ***
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/^\*\*\*$/gm, "<hr>");

  // Line breaks: double newline = paragraph
  html = html.replace(/\n\n/g, "</p><p>");

  // Single line breaks
  html = html.replace(/\n/g, "<br>");

  // Wrap in paragraph if not already wrapped in block-level tags
  if (
    !html.startsWith("<h") &&
    !html.startsWith("<ul") &&
    !html.startsWith("<ol") &&
    !html.startsWith("<blockquote") &&
    !html.startsWith("<pre") &&
    !html.startsWith("<p>") &&
    !html.startsWith("<hr")
  ) {
    html = "<p>" + html + "</p>";
  }

  return html;
}

function createNoteElement(note) {
    const div = document.createElement("div");
    div.className = `note-card ${note.color} ${note.pinned ? "pinned" : ""}`;
    div.setAttribute("data-id", note.id);

    // ===== МАГНИТ =====
    const magnet = document.createElement("div");
    magnet.className = "note-magnet";
    magnet.title = note.pinned ? "Открепить" : "Закрепить";

    
    // === ИСПРАВЛЕНИЕ: добавляем обработчик напрямую на магнит ===
    // Сохраняем ID в data-атрибут
    magnet.dataset.noteId = note.id;


    // ===== ОСТАЛЬНОЕ СОДЕРЖИМОЕ =====
    const isTrash = currentFilter === "trash";

    const contentPreview =
        note.content.length > 120
            ? note.content.slice(0, 120) + "..."
            : note.content;
    const renderedContent = renderMarkdown(contentPreview);

    // Контейнер для содержимого
    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "position:relative;z-index:1;flex:1;display:flex;flex-direction:column;";
    
    contentWrapper.innerHTML = `
        <div class="note-title">${note.title || "Без названия"}</div>
        <div class="note-content md-content">${renderedContent}</div>
        <div class="note-footer">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <div class="note-tags">
                    ${note.tags
                      .map(
                        (tag) => `
                        <span class="note-tag" onclick="filterByTag('${tag}', event)">
                            ${tag}
                            <span class="tag-remove" onclick="removeTagFromCard(${note.id}, '${tag}', event)">&times;</span>
                        </span>
                    `,
                      )
                      .join("")}
                </div>
                <span class="note-date">${note.date || ""}</span>
            </div>
            <div class="note-actions">
                ${
                  isTrash
                    ? `
                    <button class="action-button" onclick="restoreNote(${note.id}, event)">
                        <span class="material-icons">restore</span>
                    </button>
                    <button class="action-button" onclick="deletePermanently(${note.id}, event)">
                        <span class="material-icons">delete_forever</span>
                    </button>
                `
                    : `
                    <button class="action-button" onclick="changeNoteColor(${note.id}, event)">
                        <span class="material-icons">palette</span>
                    </button>
                    <button class="action-button" onclick="archiveNote(${note.id}, event)">
                        <span class="material-icons">archive</span>
                    </button>
                    <button class="action-button" onclick="deleteNote(${note.id}, event)">
                        <span class="material-icons">delete</span>
                    </button>
                `
                }
            </div>
        </div>
    `;

    // Собираем всё вместе
    div.appendChild(magnet);
    div.appendChild(contentWrapper);

    // Клик по заметке для редактирования (кроме клика по магниту)
    div.addEventListener("click", function(e) {
        // Проверяем, что клик не по магниту и не по его дочерним элементам
        if (e.target.closest('.note-magnet')) {
            return; // Если клик по магниту - ничего не делаем
        }
        
        if (!e.target.closest(".action-button") && 
            !e.target.closest(".note-tag")) {
            if (!isTrash) {
                editNote(note.id);
            }
        }
    });

    return div;
}

// ============================================
// NOTES CRUD OPERATIONS
// ============================================

function addNote() {
  currentNoteId = null;
  isPinned = false;
  isArchived = false;
  currentColor = "color-default";
  hasUnsavedChanges = false;
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").value = "";
  document.getElementById("pinEditorBtn").classList.remove("active");
  document.getElementById("archiveEditorBtn").classList.remove("active");
  document.getElementById("noteEditor").classList.add("visible");
  document.getElementById("noteTitle").focus();
  updateEditorColorPicker();
}

function editNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note || note.trashed) return;

  currentNoteId = id;
  isPinned = note.pinned;
  isArchived = note.archived || false;
  currentColor = note.color || "color-default";
  hasUnsavedChanges = false;

  document.getElementById("noteTitle").value = note.title || "";
  document.getElementById("noteContent").value = note.content || "";

  // Update pin button
  const pinBtn = document.getElementById("pinEditorBtn");
  if (isPinned) {
    pinBtn.classList.add("active");
  } else {
    pinBtn.classList.remove("active");
  }

  // Update archive button
  const archiveBtn = document.getElementById("archiveEditorBtn");
  if (isArchived) {
    archiveBtn.classList.add("active");
  } else {
    archiveBtn.classList.remove("active");
  }

  document.getElementById("noteEditor").classList.add("visible");
  updateEditorColorPicker();
  document.getElementById("noteTitle").focus();
}

function saveNote() {
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteContent").value.trim();

  if (!title && !content) {
    showToast("Заметка пуста. Закрываю...");
    hasUnsavedChanges = false;
    closeEditor();
    return;
  }

  const now = new Date();
  const dateStr =
    now.toLocaleDateString("ru-RU") +
    " " +
    now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  if (currentNoteId) {
    // Update existing note
    const index = notes.findIndex((n) => n.id === currentNoteId);
    if (index > -1) {
      notes[index] = {
        ...notes[index],
        title: title || "Без названия",
        content: content || "",
        color: currentColor,
        pinned: isPinned,
        archived: isArchived,
        date: dateStr,
      };
      showToast("Заметка обновлена");
    }
  } else {
    // Add new note
    const newNote = {
      id: Date.now(),
      title: title || "Без названия",
      content: content || "",
      color: currentColor,
      tags: ["Новое"],
      pinned: isPinned,
      archived: isArchived,
      trashed: false,
      date: dateStr,
    };
    notes.unshift(newNote);
    showToast("Заметка создана");
  }

  hasUnsavedChanges = false;
  saveNotes();
  closeEditor();
  renderNotes();
}

function deleteNote(id, e) {
  e?.stopPropagation();
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  note.trashed = true;
  note.trashDate = new Date().toISOString();
  saveNotes();
  renderNotes();
  showToast("Заметка перемещена в корзину");
}

function deletePermanently(id, e) {
  e?.stopPropagation();
  showConfirmDialog(
    "delete_perm",
    "delete_perm_" + id,
    "delete_forever",
    "Удалить навсегда?",
    "Заметка будет удалена без возможности восстановления.",
    "Удалить",
    () => {
      notes = notes.filter((n) => n.id !== id);
      saveNotes();
      renderNotes();
      showToast("Заметка удалена навсегда");
    },
  );
}

function restoreNote(id, e) {
  e?.stopPropagation();
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.trashed = false;
    note.trashDate = null;
    saveNotes();
    renderNotes();
    showToast("Заметка восстановлена");
  }
}

function archiveNote(id, e) {
  e?.stopPropagation();
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.archived = !note.archived;
    saveNotes();
    renderNotes();
    showToast(
      note.archived ? "Заметка архивирована" : "Заметка разархивирована",
    );
  }
}

function togglePin(id, e) {
    // Останавливаем всплытие, если событие передано
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    console.log("togglePin вызван для ID:", id); // Для отладки
    
    const note = notes.find((n) => n.id === id);
    if (note) {
        note.pinned = !note.pinned;
        saveNotes();
        renderNotes();
        showToast(note.pinned ? "Заметка закреплена" : "Заметка откреплена");
    } else {
        console.error("Заметка с ID", id, "не найдена");
    }
}

function togglePinInEditor() {
  isPinned = !isPinned;
  const btn = document.getElementById("pinEditorBtn");
  if (isPinned) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }
}

function toggleMarkdownMode() {
  isMarkdownMode = !isMarkdownMode;
  const btn = document.getElementById("markdownBtn");
  const icon = document.getElementById("markdownIcon");
  const hint = document.getElementById("mdHint");
  if (isMarkdownMode) {
    btn.classList.add("active");
    icon.textContent = "visibility";
    hint.style.display = "block";
    showToast("Markdown: включён (код отображается как HTML)");
  } else {
    btn.classList.remove("active");
    icon.textContent = "code";
    hint.style.display = "none";
    showToast("Markdown: выключен");
  }
}

function archiveCurrentNote() {
  if (!currentNoteId) {
    isArchived = !isArchived;
    const btn = document.getElementById("archiveEditorBtn");
    if (isArchived) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    return;
  }

  const note = notes.find((n) => n.id === currentNoteId);
  if (note) {
    note.archived = !note.archived;
    isArchived = note.archived;
    const btn = document.getElementById("archiveEditorBtn");
    if (isArchived) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    saveNotes();
    showToast(isArchived ? "Заметка архивирована" : "Заметка разархивирована");
  }
}

function changeNoteColor(id, e) {
  e?.stopPropagation();
  const note = notes.find((n) => n.id === id);
  if (note) {
    const colors = [
      "color-default",
      "color-red",
      "color-orange",
      "color-yellow",
      "color-green",
      "color-teal",
      "color-blue",
      "color-purple",
    ];
    const currentIndex = colors.indexOf(note.color);
    const nextIndex = (currentIndex === -1 ? 0 : (currentIndex + 1) % colors.length);
    note.color = colors[nextIndex];
    saveNotes();
    renderNotes();
  }
}

// ============================================
// COLOR PICKER
// ============================================

function toggleEditorColorPicker() {
  const picker = document.getElementById("editorColorPicker");
  picker.classList.toggle("visible");
}

function setEditorColor(color) {
  currentColor = color;
  document.getElementById("noteEditorContent").style.backgroundColor =
    getColorValue(color);
  // Update active state in picker
  document
    .querySelectorAll("#editorColorPicker .color-option")
    .forEach((el) => {
      el.classList.toggle("active", el.classList.contains(color));
    });
  // Close picker
  document.getElementById("editorColorPicker").classList.remove("visible");
}

function getColorValue(color) {
  const map = {
    "color-default": "var(--note-default)",
    "color-red": "var(--note-red)",
    "color-orange": "var(--note-orange)",
    "color-yellow": "var(--note-yellow)",
    "color-green": "var(--note-green)",
    "color-teal": "var(--note-teal)",
    "color-blue": "var(--note-blue)",
    "color-purple": "var(--note-purple)",
  };
  // Для правильного отображения в редакторе нужно получить вычисленное значение
  const computedStyle = getComputedStyle(document.documentElement);
  return computedStyle.getPropertyValue(map[color]).trim() || "#ffffff";
}

function updateEditorColorPicker() {
  const bg = getColorValue(currentColor);
  document.getElementById("noteEditorContent").style.backgroundColor = bg;
  document
    .querySelectorAll("#editorColorPicker .color-option")
    .forEach((el) => {
      el.classList.toggle("active", el.classList.contains(currentColor));
    });
}

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
  // Update active nav
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelector('.nav-item[data-filter="all"]')
    .classList.add("active");
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

// ============================================
// FILTERS & NAVIGATION
// ============================================

function filterNotes(filter) {
  currentFilter = filter;
  tagFilter = null;
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  const target = document.querySelector(`.nav-item[data-filter="${filter}"]`);
  if (target) target.classList.add("active");
  renderNotes();
}

function updateCounts() {
  const all = notes.filter((n) => !n.trashed && !n.archived).length;
  const pinned = notes.filter(
    (n) => n.pinned && !n.trashed && !n.archived,
  ).length;
  const archived = notes.filter((n) => n.archived && !n.trashed).length;
  const trashed = notes.filter((n) => n.trashed).length;

  document.getElementById("countAll").textContent = all;
  document.getElementById("countPinned").textContent = pinned;
  document.getElementById("countArchive").textContent = archived;
  document.getElementById("countTrash").textContent = trashed;

  renderTags();
}

// ============================================
// VIEW TOGGLES
// ============================================

function toggleView() {
  if (currentView === "grid") {
    setView("list");
  } else {
    setView("grid");
  }
}

function setView(view) {
    currentView = view;
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    // Переключаем класс для отображения
    container.classList.toggle('list-view', view === 'list');
    
    // Обновляем активную кнопку
    document.querySelectorAll('.view-button').forEach(btn => {
        btn.classList.remove('active');
        // Сравниваем с data-view атрибутом или текстом
        const btnView = btn.getAttribute('data-view') || btn.textContent.toLowerCase().trim();
        if (btnView === view) {
            btn.classList.add('active');
        }
    });
    
    // Сохраняем выбор
    storageSet('material_keep_view', view);
}

// ============================================
// SEARCH
// ============================================

function setupSearch() {
  const input = document.getElementById("searchInput");
  let timeout;
  input.addEventListener("input", (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      searchTerm = e.target.value;
      renderNotes();
    }, 300);
  });

  // Clear search on Escape
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      searchTerm = "";
      renderNotes();
      input.blur();
    }
  });
}

// ============================================
// TOAST NOTIFICATION
// ============================================

let toastTimeout;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2500);
}

// ============================================
// THEME TOGGLE
// ============================================

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('material_keep_theme', newTheme);
    updateThemeIcon(newTheme);
    updateLogoColors(newTheme); // <-- добавляем обновление логотипа
    showToast(isDark ? 'Светлая тема' : 'Тёмная тема');
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (theme === 'dark') {
    		icon.innerHTML = `
    		            <circle cx="12" cy="12" r="5"/>
    		            <path d="M12 1v2"/>
    		            <path d="M12 21v2"/>
    		            <path d="M4.22 4.22l1.42 1.42"/>
    		            <path d="M18.36 18.36l1.42 1.42"/>
    		            <path d="M1 12h2"/>
    		            <path d="M21 12h2"/>
    		            <path d="M4.22 19.78l1.42-1.42"/>
    		            <path d="M18.36 5.64l1.42-1.42"/>
    		        `;
        
    } else {
        icon.innerHTML = `
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                `;
    }
}

function loadTheme() {
  const saved = storageGet("material_keep_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

// ============================================
// EDITOR CONTROLS
// ============================================

function closeEditor() {
  if (hasUnsavedChanges) {
    document.getElementById("confirmDialog").classList.add("visible");
    return;
  }
  forceCloseEditor();
}

function forceCloseEditor() {
  document.getElementById("noteEditor").classList.remove("visible");
  document.getElementById("editorColorPicker").classList.remove("visible");
  document.getElementById("mdHint").style.display = "none";
  isMarkdownMode = false;
  document.getElementById("markdownBtn").classList.remove("active");
  document.getElementById("markdownIcon").textContent = "code";
  currentNoteId = null;
  hasUnsavedChanges = false;
}

function confirmSave() {
  document.getElementById("confirmDialog").classList.remove("visible");
  saveNote();
  forceCloseEditor();
}

function confirmDiscard() {
  document.getElementById("confirmDialog").classList.remove("visible");
  hasUnsavedChanges = false;
  forceCloseEditor();
}

function confirmCancel() {
  document.getElementById("confirmDialog").classList.remove("visible");
}

// ============================================
// GENERIC CONFIRM DIALOG
// ============================================

let confirmCallback = null;

function showConfirmDialog(
  namespace,
  id,
  icon,
  title,
  message,
  okText,
  callback,
) {
  const dialog = document.getElementById("genericConfirmDialog");
  document.getElementById("genericConfirmIcon").textContent = icon || "warning";
  document.getElementById("genericConfirmTitle").textContent =
    title || "Подтверждение";
  document.getElementById("genericConfirmMessage").textContent = message || "";
  document.getElementById("genericConfirmOkBtn").textContent =
    okText || "Подтвердить";

  confirmCallback = { namespace, id, callback };
  dialog.classList.add("visible");
}

function closeGenericConfirm() {
  document.getElementById("genericConfirmDialog").classList.remove("visible");
  confirmCallback = null;
}

// ============================================
// PROMPT DIALOG
// ============================================

let promptCallback = null;

function showPromptDialog(callback) {
  const dialog = document.getElementById("promptDialog");
  const input = document.getElementById("promptInput");
  input.value = "";
  promptCallback = callback;
  dialog.classList.add("visible");
  setTimeout(() => input.focus(), 100);
}

function closePromptDialog() {
  document.getElementById("promptDialog").classList.remove("visible");
  promptCallback = null;
}

function markEditorChanged() {
  hasUnsavedChanges = true;
}

function clearTrash() {
    const trashedNotes = notes.filter(n => n.trashed);
    
    if (trashedNotes.length === 0) {
        showToast('Корзина уже пуста');
        return;
    }
    
    showConfirmDialog(
        'clear_trash',
        'clear_trash',
        'delete_sweep',
        'Очистить корзину?',
        `В корзине ${trashedNotes.length} заметок. Они будут удалены без возможности восстановления.`,
        'Очистить',
        () => {
            notes = notes.filter(n => !n.trashed);
            saveNotes();
            renderNotes();
            showToast(`Корзина очищена (${trashedNotes.length} заметок удалено)`);
        }
    );
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown", (e) => {
  // Ctrl+N - new note
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    addNote();
  }

  // Escape - close editor
  if (e.key === "Escape") {
    closeEditor();
  }

  // Ctrl+S - save note
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    if (document.getElementById("noteEditor").classList.contains("visible")) {
      e.preventDefault();
      saveNote();
    }
  }
});

// ============================================
// INITIALIZATION
// ============================================

function init() {
    loadTheme();
    loadNotes();
    
    // Загружаем сохранённый вид
    const savedView = localStorage.getItem('material_keep_view');
    if (savedView) {
        setView(savedView);
    } else {
        setView('grid');
    }
    
    renderNotes();
    setupSearch();
    updateCounts();
    
    // Обновляем цвета логотипа при загрузке
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateLogoColors(currentTheme);

  // Click outside modal to close
  document.getElementById("noteEditor").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closeEditor();
    }
  });

  document.getElementById("addNoteBtn").addEventListener("click", addNote);

  // Generic confirm dialog
  document
    .getElementById("genericConfirmDialog")
    .addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        closeGenericConfirm();
      }
    });
  document
    .getElementById("genericConfirmCancelBtn")
    .addEventListener("click", closeGenericConfirm);
  document
    .getElementById("genericConfirmOkBtn")
    .addEventListener("click", () => {
      if (confirmCallback && confirmCallback.callback) {
        confirmCallback.callback();
      }
      closeGenericConfirm();
    });

  // Prompt dialog
  document.getElementById("promptDialog").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closePromptDialog();
    }
  });
  document
    .getElementById("promptCancelBtn")
    .addEventListener("click", closePromptDialog);
  document.getElementById("promptOkBtn").addEventListener("click", () => {
    const input = document.getElementById("promptInput");
    if (promptCallback) {
      promptCallback(input.value);
    }
    closePromptDialog();
  });
  document.getElementById("promptInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      document.getElementById("promptOkBtn").click();
    }
  });

  // Track unsaved changes in editor
  document
    .getElementById("noteTitle")
    .addEventListener("input", markEditorChanged);
  document
    .getElementById("noteContent")
    .addEventListener("input", markEditorChanged);

  // Close confirmation dialog on click outside
  document.getElementById("confirmDialog").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      confirmCancel();
    }
  });

  // Register Service Worker for PWA offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      console.log("✅ Service Worker registered:", reg.scope);
    }).catch((err) => {
      console.warn("⚠️ Service Worker registration failed:", err);
    });
  }

  console.log("✨ Keeprus полностью функционален!");
  console.log("📝 Горячие клавиши: Ctrl+N - новая заметка, Ctrl+S - сохранить");
}

// Start the app
init();
