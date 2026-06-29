
// ============================================
// NOTES CRUD OPERATIONS
// ============================================

function addNote() {
    currentNoteId = null;
    isPinned = false;
    isArchived = false;
    currentColor = "color-default";
    hasUnsavedChanges = false;
    
    // Сбрасываем редактор
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("pinEditorBtn").classList.remove("active");
    document.getElementById("archiveEditorBtn").classList.remove("active");
    
    // Показываем редактор
    document.getElementById("noteEditor").classList.add("visible");
    document.getElementById("noteTitle").focus();
    updateEditorColorPicker();
    
    // Показываем подсказку
    document.getElementById("mdHint").style.display = "block";
}

function editNote(id) {
    const note = notes.find((n) => n.id === id);
    if (!note || note.trashed) return;

    currentNoteId = id;
    isPinned = note.pinned;
    isArchived = note.archived || false;
    currentColor = note.color || "color-default";
    hasUnsavedChanges = false;

    //  СБРАСЫВАЕМ MARKDOWN ПРИ ОТКРЫТИИ
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

// ============================================
// СОХРАНЕНИЕ ЗАМЕТКИ (ОПТИМИЗИРОВАННАЯ ВЕРСИЯ)
// ============================================

function saveNoteSilent() {
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();

    // Не сохраняем совсем пустые заметки
    if (!title && !content && !currentNoteId) {
        return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("ru-RU") + " " + 
                    now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    let isNew = false;

    if (currentNoteId) {
        // Обновляем существующую заметку
        const index = notes.findIndex(n => n.id === currentNoteId);
        if (index > -1) {
            const oldNote = notes[index];
            
            // Проверяем, изменилось ли что-то
            const hasChanges = 
                oldNote.title !== title ||
                oldNote.content !== content ||
                oldNote.color !== currentColor ||
                oldNote.pinned !== isPinned ||
                oldNote.archived !== isArchived;

            if (!hasChanges && !isNew) {
                // Ничего не изменилось — не сохраняем
                return;
            }

            notes[index] = {
                ...oldNote,
                title: title || "",
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
            title: title || "",
            content: content || "",
            color: currentColor,
            tags: ["Новое"],
            pinned: isPinned,
            archived: isArchived,
            trashed: false,
            date: dateStr,
        };
        notes.unshift(newNote);
        currentNoteId = newNote.id;
        isNew = true;
    }

    hasUnsavedChanges = false;
    
    // Сохраняем в localStorage
    saveNotes();

    // ✅ ОПТИМИЗАЦИЯ: Обновляем только одну карточку
    if (isNew) {
        // Новая заметка — добавляем карточку
        const note = notes.find(n => n.id === currentNoteId);
        if (note && typeof addNoteCard === 'function') {
            addNoteCard(note);
        } else {
            // Fallback: полная перерисовка
            renderNotes();
        }
    } else {
        // Обновляем существующую карточку
        if (typeof updateNoteCard === 'function') {
            updateNoteCard(currentNoteId);
        } else {
            renderNotes();
        }
    }
}

function saveNote() {
    saveNoteSilent();
    closeEditor();
}

function deleteNote(id, e) {
    e?.stopPropagation();
    const note = notes.find(n => n.id === id);
    if (!note) return;

    note.trashed = true;
    note.trashDate = new Date().toISOString();
    saveNotes();
    
    // ✅ Удаляем карточку из DOM
    if (typeof removeNoteCard === 'function') {
        removeNoteCard(id);
    } else {
        renderNotes();
    }
    
    updateCounts();
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
    const note = notes.find(n => n.id === id);
    if (note) {
        note.archived = !note.archived;
        saveNotes();
        
        // ✅ Обновляем карточку
        if (typeof updateNoteCard === 'function') {
            updateNoteCard(id);
        } else {
            renderNotes();
        }
        
        updateCounts();
    }
}

function togglePin(id, e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    const note = notes.find(n => n.id === id);
    if (note) {
        note.pinned = !note.pinned;
        saveNotes();
        
        // ✅ Обновляем карточку
        if (typeof updateNoteCard === 'function') {
            updateNoteCard(id);
        } else {
            renderNotes();
        }
        
        updateCounts();
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
        
        // ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ СТИЛИ
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
    const note = notes.find(n => n.id === id);
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
        
        // ✅ Обновляем карточку
        if (typeof updateNoteCard === 'function') {
            updateNoteCard(id);
        } else {
            renderNotes();
        }
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
        showToast('Нет заметок для сохранения');
        return;
    }
    
    try {
        // Формируем имя с датой и временем
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // 2026-06-27
        const timeStr = now.toISOString().slice(11, 16).replace(':', '-'); // 14-30
        const filename = `заметки_${dateStr}_${timeStr}.json`;
        
        // Используем стандартный диалог сохранения
        if ('showSaveFilePicker' in window) {
            const options = {
                suggestedName: filename,
                types: [{
                    description: 'JSON файл',
                    accept: { 'application/json': ['.json'] }
                }]
            };
            
            const fileHandle = await window.showSaveFilePicker(options);
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(notes, null, 2));
            await writable.close();
            
            showToast(`Сохранено заметок ${notes.length}`);
        } else {
            // Fallback для старых браузеров
            const blob = new Blob([JSON.stringify(notes, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`Сохранено заметок ${notes.length}`);
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
            showToast(`Загружено заметок ${notes.length}`);
            
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
                showToast(`Загружено заметок ${notes.length}`);
            };
            
            input.click();
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            showToast('❌ Ошибка: ' + e.message);
        }
    }
}

// ============================================
// ЗАГРУЗКА КАРТИНКИ НА СЕРВЕР
// ============================================

async function insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            showToast('⏳ Загрузка...');
            const response = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Вставляем ссылку в заметку
                const content = document.getElementById('noteContent');
                const cursorPos = content.selectionStart || content.value.length;
                const markdown = `\n![image](${data.url})\n`;
                
                const newValue = content.value.slice(0, cursorPos) + markdown + content.value.slice(cursorPos);
                content.value = newValue;
                content.focus();
                content.selectionStart = content.selectionEnd = cursorPos + markdown.length;
                content.dispatchEvent(new Event('input'));
                
                showToast('✅ Картинка загружена и вставлена');
            } else {
                showToast('❌ Ошибка: ' + data.error);
            }
        } catch (error) {
            showToast('❌ Ошибка загрузки: ' + error.message);
        }
    };
    
    input.click();
}

// ============================================
// НАПОМИНАНИЕ — МОДАЛКА ДЛЯ КАРТОЧКИ
// ============================================

function showReminderModal(noteId, e) {
    if (e) e.stopPropagation();
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    // Сохраняем ID для работы
    window._reminderNoteId = noteId;
    
    showReminderDialog(note);
}

function showReminderDialog(note) {
    const existing = document.querySelector('.reminder-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'reminder-overlay';
    overlay.innerHTML = `
        <div class="reminder-modal">
            <div class="reminder-header">
                <span class="reminder-icon"></span>
                <span class="reminder-title">Напоминание</span>
                <button class="reminder-close" onclick="this.closest('.reminder-overlay').remove()">✕</button>
            </div>
            <div class="reminder-body">
                <label>Дата:</label>
                <input type="date" id="reminderDate" value="${note.reminder?.date || ''}">
                
                <label>Время:</label>
                <input type="time" id="reminderTime" value="${note.reminder?.time || ''}">
                
                ${note.reminder ? `
                    <div class="reminder-current">
                        Текущее: ${note.reminder.date} ${note.reminder.time}
                    </div>
                ` : ''}
            </div>
            <div class="reminder-footer">
                ${note.reminder ? `
                    <button class="reminder-btn danger" onclick="removeReminder(${note.id})">Удалить</button>
                ` : ''}
                <button class="reminder-btn" onclick="this.closest('.reminder-overlay').remove()">Отмена</button>
                <button class="reminder-btn primary" onclick="saveReminder(${note.id})">Установить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Фокус на дату
    setTimeout(() => {
        const dateInput = document.getElementById('reminderDate');
        if (dateInput) dateInput.focus();
    }, 100);
}

function showReminderModalForEditor() {
    if (!currentNoteId) {
        showToast('Сначала сохраните заметку');
        return;
    }
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        showReminderDialog(note);
    }
}

function saveReminder(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;

    if (!date || !time) {
        showToast('Выберите дату и время');
        return;
    }

    const timestamp = new Date(`${date}T${time}`).getTime();
    if (timestamp < Date.now()) {
        showToast('Нельзя установить напоминание в прошлом');
        return;
    }

    note.reminder = { date, time, timestamp };
    saveNotes();
    
    // ✅ Обновляем карточку
    if (typeof updateNoteCard === 'function') {
        updateNoteCard(noteId);
    } else {
        renderNotes();
    }
    
    scheduleReminder(note);
    showToast(`Напоминание установлено на ${date} ${time}`);

    // Закрываем модалку
    const overlay = document.querySelector('.reminder-overlay');
    if (overlay) overlay.remove();
}

function removeReminder(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        delete note.reminder;
        saveNotes();
        renderNotes();
        showToast('Напоминание удалено');
    }
    const overlay = document.querySelector('.reminder-overlay');
    if (overlay) overlay.remove();
}

// ============================================
// ПЛАНИРОВЩИК НАПОМИНАНИЙ
// ============================================

let reminderTimeouts = [];

function scheduleAllReminders() {
    // Очищаем старые таймеры
    reminderTimeouts.forEach(t => clearTimeout(t));
    reminderTimeouts = [];

    notes.forEach(note => {
        if (note.reminder && note.reminder.timestamp > Date.now()) {
            scheduleReminder(note);
        }
    });
}

function scheduleReminder(note) {
    if (!note || !note.reminder) return;
    
    const delay = note.reminder.timestamp - Date.now();
    if (delay <= 0) return;

    // Очищаем старый таймер для этой заметки
    reminderTimeouts.forEach((t, index) => {
        if (t._noteId === note.id) {
            clearTimeout(t);
            reminderTimeouts.splice(index, 1);
        }
    });

    const timeout = setTimeout(() => {
        showReminderNotification(note);
    }, delay);
    
    timeout._noteId = note.id;
    reminderTimeouts.push(timeout);
}

function showReminderNotification(note) {
    // Проверяем разрешение на уведомления
    if (Notification.permission === 'granted') {
        new Notification('Keeprus — Напоминание', {
            body: `${note.title || 'Без названия'}\n${note.reminder.date} ${note.reminder.time}`,
            icon: '/favicon.svg'
        });
    } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showReminderNotification(note);
            }
        });
    }

    // ⭐ ТОСТ С КНОПКОЙ (вместо обычного)
    showReminderToast(` Напоминание: ${note.title || 'Без названия'}`);
}

// ============================================
// УДАЛЕНИЕ НАПОМИНАНИЯ ИЗ КАРТОЧКИ
// ============================================

function removeReminderFromCard(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    delete note.reminder;

    // Удаляем таймер
    reminderTimeouts = reminderTimeouts.filter(t => {
        if (t._noteId === noteId) {
            clearTimeout(t);
            return false;
        }
        return true;
    });

    saveNotes();
    
    // ✅ Обновляем карточку
    if (typeof updateNoteCard === 'function') {
        updateNoteCard(noteId);
    } else {
        renderNotes();
    }
    
    showToast('Напоминание удалено');
}
