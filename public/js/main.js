// ============================================
// DATA LAYER
// ============================================

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

// ============================================
// ЗАГРУЗКА ЗАМЕТОК
// ============================================

async function loadNotes() {
    const saved = localStorage.getItem('keeprus_notes_fallback');
    if (saved) {
        try {
            notes = JSON.parse(saved);
            return;
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }
    
    notes = getDefaultNotes();
    localStorage.setItem('keeprus_notes_fallback', JSON.stringify(notes));
}

// ============================================
// СОХРАНЕНИЕ ЗАМЕТОК
// ============================================

async function saveNotes() {
    try {
        localStorage.setItem('keeprus_notes_fallback', JSON.stringify(notes));
        hasUnsavedChanges = false;
        updateCounts();
        
        // Обновляем статистику, если она открыта
        if (typeof scheduleStatsUpdate === 'function') {
            scheduleStatsUpdate();
        }
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        showToast('❌ Ошибка сохранения');
    }
}

// ============================================
// ДЕФОЛТНЫЕ ЗАМЕТКИ
// ============================================

function getDefaultNotes() {
    return [
        {
            id: Date.now() - 100000,
            title: 'Добро пожаловать в Keeprus!',
            content: '• Все заметки сохраняются в браузере\n• Используйте меню (☰) для сохранения в файл\n• Открывайте файлы с заметками из любого браузера',
            color: 'color-yellow',
            tags: ['Вступление'],
            pinned: true,
            archived: false,
            trashed: false,
            date: new Date().toLocaleDateString('ru-RU'),
            history: []
        }
    ];
}

// ============================================
// ОБНОВЛЕНИЕ ЛОГОТИПА
// ============================================

function updateLogoColors(theme) {
    const svg = document.querySelector('.logo svg');
    if (!svg) return;
    
    const elements = svg.querySelectorAll('path, circle');
    const gradientId = theme === 'dark' ? 'logoGradDark' : 'logoGradLight';
    
    elements.forEach(el => {
        el.setAttribute('fill', `url(#${gradientId})`);
    });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    loadTheme();
    await loadNotes();
    
    const savedView = localStorage.getItem('material_keep_view');
    setView(savedView || 'grid');
    
    renderNotes(false);
    setupSearch();
    updateCounts();
    loadColorFilterState();
    
    // Рендерим фильтр по цвету
    if (typeof renderColorFilter === 'function') {
        renderColorFilter();
        console.log('✅ Фильтр по цвету отрисован при загрузке');
    }
    
    // Обновляем логотип
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateLogoColors(currentTheme);

    // Click outside modal to close
    document.getElementById("noteEditor").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            closeEditor();
        }
    });

    // Автосохранение при вводе
    document.getElementById("noteTitle").addEventListener("input", function() {
        hasUnsavedChanges = true;
        saveNoteSilent();
    });
    
    document.getElementById("noteContent").addEventListener("input", function() {
        hasUnsavedChanges = true;
        saveNoteSilent();
    });

    document.getElementById("addNoteBtn").addEventListener("click", addNote);

    // Generic confirm dialog
    document.getElementById("genericConfirmDialog").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            closeGenericConfirm();
        }
    });
    document.getElementById("genericConfirmCancelBtn").addEventListener("click", closeGenericConfirm);
    document.getElementById("genericConfirmOkBtn").addEventListener("click", () => {
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
    document.getElementById("promptCancelBtn").addEventListener("click", closePromptDialog);
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
    document.getElementById("noteTitle").addEventListener("input", markEditorChanged);
    document.getElementById("noteContent").addEventListener("input", markEditorChanged);

    // Close confirmation dialog on click outside
    document.getElementById("confirmDialog").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            confirmCancel();
        }
    });

    // ============================================
    // ✅ ИСПРАВЛЕННОЕ ЗАКРЫТИЕ РЕДАКТОРА С СОХРАНЕНИЕМ ВЕРСИИ
    // ============================================
    
    const originalCloseEditor = window.closeEditor;
    if (originalCloseEditor) {
        window.closeEditor = function() {
            if (currentNoteId && hasUnsavedChanges) {
                const title = document.getElementById('noteTitle').value.trim();
                const content = document.getElementById('noteContent').value.trim();
                
                const note = notes.find(n => n.id === currentNoteId);
                if (note) {
                    note.title = title;
                    note.content = content;
                    
                    if (typeof createVersion === 'function') {
                        createVersion(currentNoteId);
                    } else {
                        console.warn('⚠️ createVersion не найдена');
                    }
                }
            }
            
            originalCloseEditor.apply(this, arguments);
        };
    }

    // Экспортируем функции для глобального доступа
    window.applyAllFilters = applyAllFilters;
    window.clearTagFilter = clearTagFilter;
    window.applyTagFilter = applyTagFilter;

    // ============================================
    // ДОБАВЛЯЕМ КНОПКУ ИСТОРИИ В РЕДАКТОР
    // ============================================
    
    setTimeout(() => {
        if (typeof addHistoryButtonToEditor === 'function') {
            addHistoryButtonToEditor();
        }
    }, 100);

    // Планируем напоминания после загрузки заметок
    if (typeof scheduleAllReminders === 'function') {
        scheduleAllReminders();
        console.log('⏰ Напоминания запланированы');
    }
    
    // Запрашиваем разрешение на уведомления (не блокируем инициализацию)
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // // Register Service Worker for PWA offline support
    // if ("serviceWorker" in navigator) {
    //     navigator.serviceWorker.register("./sw.js").then((reg) => {
    //         console.log("✅ Service Worker registered:", reg.scope);
    //     }).catch((err) => {
    //         console.warn("⚠️ Service Worker registration failed:", err);
    //     });
    // }

    console.log("✨ Keeprus полностью функционален!");
    console.log("📝 Горячие клавиши: Ctrl+N - новая заметка, Ctrl+S - сохранить");
    console.log("💾 Заметки хранятся в localStorage браузера");
    console.log("📁 Для резервного копирования используйте меню → Сохранить как...");
}

// Start the app
init();
