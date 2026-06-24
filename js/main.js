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
