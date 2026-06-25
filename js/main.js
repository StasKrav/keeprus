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
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        showToast('❌ Ошибка сохранения');
    }
}

// ============================================
// СОХРАНЕНИЕ В ФАЙЛ (Сохранить как...)
// ============================================

async function saveNotesAs() {
    if (notes.length === 0) {
        showToast('Нет заметок для сохранения');
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
            
            // Сохраняем массив заметок
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

// ============================================
// ОТКРЫТИЕ ФАЙЛА
// ============================================

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
            date: new Date().toLocaleDateString('ru-RU')
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
    
    renderNotes();
    setupSearch();
    updateCounts();
    
    // Обновляем логотип
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateLogoColors(currentTheme);
    
    // Показываем подсказку при первом запуске
    const onboarded = localStorage.getItem('keeprus_onboarded');
    if (!onboarded) {
        localStorage.setItem('keeprus_onboarded', 'true');
        setTimeout(() => {
            showToast('💡 Сохраняйте заметки через меню → "Сохранить как..."');
        }, 500);
    }

    // Click outside modal to close
    document.getElementById("noteEditor").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            closeEditor();
        }
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
    console.log("💾 Заметки хранятся в localStorage браузера");
    console.log("📁 Для резервного копирования используйте меню → Сохранить как...");
}

// Start the app
init();
