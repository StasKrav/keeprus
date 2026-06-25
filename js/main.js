// ============================================
// DATA LAYER
// ============================================



let notes = [];
let isFirstLaunch = true;
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

// ============================================
// ЗАГРУЗКА ЗАМЕТОК
// ============================================

async function loadNotes() {
    // Только localStorage, никакой файловой системы при загрузке
    const saved = localStorage.getItem('keeprus_notes_fallback');
    if (saved) {
        try {
            notes = JSON.parse(saved);
            return;
        } catch (e) {}
    }
    
    // Дефолтные заметки
    notes = getDefaultNotes();
    // Сохраняем дефолтные в localStorage
    localStorage.setItem('keeprus_notes_fallback', JSON.stringify(notes));
}

// ============================================
// СОХРАНЕНИЕ ЗАМЕТОК НА ДИСК
// ============================================

async function saveNotes() {
    if (folderHandle) {
        // Сохраняем в файл
        try {
            const fileHandle = await folderHandle.getFileHandle('notes.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(notes, null, 2));
            await writable.close();
            hasUnsavedChanges = false;
            updateCounts();
            return;
        } catch (e) {
            console.error('Ошибка сохранения в файл:', e);
        }
    }
    
    // Fallback: сохраняем в localStorage
    try {
        localStorage.setItem('keeprus_notes_fallback', JSON.stringify(notes));
        hasUnsavedChanges = false;
        updateCounts();
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        showToast('Ошибка сохранения заметок');
    }
}

// ============================================
// ВЫБОР ПАПКИ
// ============================================

async function selectFolder() {
    if (!('showDirectoryPicker' in window)) {
        showToast('Используйте Chrome или Edge для выбора папки');
        return;
    }
    
    try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        folderHandle = handle;
        localStorage.setItem('keeprus_folder', JSON.stringify(handle));
        
        // Сохраняем заметки в новую папку
        await saveNotes();
        renderNotes();
        
        showToast('✅ Папка изменена');
        closeHamburgerMenu();
    } catch (e) {
        if (e.name !== 'AbortError') {
            showToast('Ошибка: ' + e.message);
        }
    }
}

// ============================================
// ОТКРЫТЬ ФАЙЛ
// ============================================

function openNotesFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async function() {
        const file = this.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!Array.isArray(data)) {
                showToast('Неверный формат файла');
                return;
            }
            
            if (!confirm(`Заменить текущие заметки (${data.length} шт.)?`)) {
                return;
            }
            
            notes = data;
            await saveNotes();
            renderNotes();
            showToast(`✅ Загружено ${notes.length} заметок`);
            closeHamburgerMenu();
        } catch (e) {
            showToast('Ошибка: ' + e.message);
        }
    };
    
    input.click();
}

// ============================================
// ДЕФОЛТНЫЕ ЗАМЕТКИ
// ============================================

function getDefaultNotes() {
    return [
        {
            id: Date.now() - 100000,
            title: 'Добро пожаловать в Keeprus!',
            content: '• Все заметки сохраняются на диск\n• Выберите папку для хранения\n• Автосохранение каждые 30 секунд',
            color: 'color-yellow',
            tags: ['Вступление'],
            pinned: true,
            archived: false,
            trashed: false,
            date: new Date().toLocaleDateString('ru-RU')
        }
    ];
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
// АВТОСОХРАНЕНИЕ
// ============================================

let autoSaveInterval = null;

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(async () => {
        console.log('⏰ Автосохранение: проверка...');
        console.log('hasUnsavedChanges:', hasUnsavedChanges);
        console.log('folderHandle:', !!folderHandle);
        
        if (hasUnsavedChanges && folderHandle) {
            console.log('💾 Автосохранение: сохраняю...');
            await saveNotes();
            showToast('💾 Автосохранение');
        } else if (hasUnsavedChanges && !folderHandle) {
            console.log('⚠️ Папка не выбрана, сохраняю в localStorage');
            await saveNotes();
        }
    }, 30000); // 30 секунд
    
    console.log('✅ Автосохранение включено (каждые 30 секунд)');
}
// ============================================
// INITIALIZATION
// ============================================

async function init() {
    loadTheme();
    
    // Восстанавливаем папку
    const savedFolder = localStorage.getItem('keeprus_folder');
    if (savedFolder) {
        try {
            folderHandle = JSON.parse(savedFolder);
            await folderHandle.requestPermission({ mode: 'readwrite' });
        } catch (e) {
            folderHandle = null;
            localStorage.removeItem('keeprus_folder');
        }
    }
    
    // Загружаем заметки
    await loadNotes();
    
    // Загружаем вид
    const savedView = localStorage.getItem('material_keep_view');
    setView(savedView || 'grid');
    
    renderNotes();
    setupSearch();
    updateCounts();

    
    // Обновляем логотип
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

