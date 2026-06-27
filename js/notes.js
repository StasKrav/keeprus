
// ============================================
// NOTES CRUD OPERATIONS
// ============================================

function addNote() {
    currentNoteId = null;
    isPinned = false;
    isArchived = false;
    currentColor = "color-default";
    hasUnsavedChanges = false;
    
    //  СБРАСЫВАЕМ MARKDOWN
    if (isMarkdownMode) {
        isMarkdownMode = false;
        document.getElementById("markdownBtn").classList.remove("active");
        document.getElementById("markdownIcon").textContent = "code";
        document.getElementById("mdHint").style.display = "none";
        
        const preview = document.getElementById("mdPreview");
        if (preview) {
            preview.remove();
        }
        document.getElementById("noteContent").style.display = "block";
    }
    
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("pinEditorBtn").classList.remove("active");
    document.getElementById("archiveEditorBtn").classList.remove("active");
    document.getElementById("noteEditor").classList.add("visible");
    document.getElementById("noteTitle").focus();
    updateEditorColorPicker();

    //  ПОКАЗЫВАЕМ ПОДСКАЗКУ ПРИ СОЗДАНИИ
        document.getElementById("mdHint").style.display = "block";
        
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

    // ⭐ СБРАСЫВАЕМ MARKDOWN ПРИ ОТКРЫТИИ
    if (isMarkdownMode) {
        isMarkdownMode = false;
        document.getElementById("markdownBtn").classList.remove("active");
        document.getElementById("markdownIcon").textContent = "code";
        document.getElementById("mdHint").style.display = "none";
        
        // Удаляем превью
        const preview = document.getElementById("mdPreview");
        if (preview) {
            preview.remove();
        }
        
        // Показываем textarea
        document.getElementById("noteContent").style.display = "block";
    }

    document.getElementById("noteTitle").value = note.title || "";
    document.getElementById("noteContent").value = note.content || "";

    // Обновляем кнопки
    const pinBtn = document.getElementById("pinEditorBtn");
    if (isPinned) {
        pinBtn.classList.add("active");
    } else {
        pinBtn.classList.remove("active");
    }

    const archiveBtn = document.getElementById("archiveEditorBtn");
    if (isArchived) {
        archiveBtn.classList.add("active");
    } else {
        archiveBtn.classList.remove("active");
    }

    document.getElementById("noteEditor").classList.add("visible");
    updateEditorColorPicker();
    document.getElementById("noteTitle").focus();

     //  ПОКАЗЫВАЕМ ПОДСКАЗКУ ПРИ ОТКРЫТИИ
    document.getElementById("mdHint").style.display = "block";
    
    document.getElementById("noteEditor").classList.add("visible");
    updateEditorColorPicker();
    document.getElementById("noteTitle").focus();
}

function saveNote() {
    const title = document.getElementById("noteTitle").value.trim();
    
    // Берём контент из textarea (всегда из textarea)
    const content = document.getElementById("noteContent").value.trim();

    if (!title && !content) {
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
        // Обновляем существующую заметку
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
        }
    } else {
        // Создаём новую заметку
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
  }
}

function archiveNote(id, e) {
  e?.stopPropagation();
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.archived = !note.archived;
    saveNotes();
    renderNotes();
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
    const content = document.getElementById("noteContent");
    const editor = document.getElementById("noteEditorContent");
    
    if (isMarkdownMode) {
        btn.classList.add("active");
        icon.textContent = "visibility";
        hint.style.display = "none";
        
        const rawText = content.value;
        content.style.display = "none";
        
        let preview = document.getElementById("mdPreview");
        if (!preview) {
            preview = document.createElement("div");
            preview.id = "mdPreview";
            preview.className = "md-preview";
            content.parentNode.insertBefore(preview, content.nextSibling);
        }
        
        // ⭐ ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ СТИЛИ
        preview.style.display = "block";
        preview.style.maxHeight = "730px";
        preview.style.overflowY = "auto";
        preview.style.minHeight = "300px";
        preview.style.padding = "16px 20px";
        
        preview.innerHTML = renderMarkdown(rawText);
        
    } else {
        btn.classList.remove("active");
        icon.textContent = "code";
        hint.style.display = "block";
        content.style.display = "block";
        
        const preview = document.getElementById("mdPreview");
        if (preview) {
            preview.style.display = "none";
        }
        
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

function markEditorChanged() {
    hasUnsavedChanges = true;
    console.log('🔄 Изменения отмечены'); // для отладки
}

// ============================================
// СОХРАНЕНИЕ И ОТКРЫТИЕ ФАЙЛОВ (ручное)
// ============================================

// Сохранить как... (выбор места и имени файла)
async function saveNotesAs() {
    if (notes.length === 0) {
        return;
    }
    
    try {
        // Используем стандартный диалог сохранения
        if ('showSaveFilePicker' in window) {
            const options = {
                suggestedName: `заметки_${new Date().toISOString().slice(0,10)}.json`,
                types: [{
                    description: 'JSON файл',
                    accept: { 'application/json': ['.json'] }
                }]
            };
            
            const fileHandle = await window.showSaveFilePicker(options);
            const writable = await fileHandle.createWritable();
            
            // Просто сохраняем массив заметок
            await writable.write(JSON.stringify(notes, null, 2));
            await writable.close();
            
            showToast(`✅ Сохранено ${notes.length} заметок`);
        } else {
            // Если браузер старый - скачиваем файл
            const blob = new Blob([JSON.stringify(notes, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `заметки_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`✅ Сохранено ${notes.length} заметок`);
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            showToast('❌ Ошибка: ' + e.message);
        }
    }
}

// Открыть файл
async function openNotesFile() {
    if (hasUnsavedChanges) {
        if (!confirm('У вас есть несохранённые изменения. Открыть файл без сохранения?')) {
            return;
        }
    }
    
    try {
        if ('showOpenFilePicker' in window) {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON файл',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            
            const file = await fileHandle.getFile();
            const text = await file.text();
            const loadedNotes = JSON.parse(text);
            
            if (!Array.isArray(loadedNotes)) {
                showToast('❌ Неверный формат файла');
                return;
            }
            
            notes = loadedNotes;
            hasUnsavedChanges = false;
            
            // Сохраняем в localStorage как резервную копию
            localStorage.setItem('keeprus_notes_fallback', JSON.stringify(notes));
            
            renderNotes();
            updateCounts();
            showToast(`✅ Загружено ${notes.length} заметок`);
            
        } else {
            // Старый браузер - через input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async function() {
                const file = this.files[0];
                if (!file) return;
                
                const text = await file.text();
                const loadedNotes = JSON.parse(text);
                
                if (!Array.isArray(loadedNotes)) {
                    showToast('❌ Неверный формат файла');
                    return;
                }
                
                notes = loadedNotes;
                hasUnsavedChanges = false;
                localStorage.setItem('keeprus_notes_fallback', JSON.stringify(notes));
                renderNotes();
                updateCounts();
                showToast(`✅ Загружено ${notes.length} заметок`);
            };
            
            input.click();
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            showToast('❌ Ошибка: ' + e.message);
        }
    }
}
