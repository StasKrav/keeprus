
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
    
    container.classList.toggle('list-view', view === 'list');
    
    // Обновляем активное состояние для кнопок в хедере
    document.querySelectorAll('.view-button-header').forEach(btn => {
        btn.classList.remove('active');
        const btnView = btn.getAttribute('data-view');
        if (btnView === view) {
            btn.classList.add('active');
        }
    });
    
    localStorage.setItem('material_keep_view', view);
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
    const saved = localStorage.getItem('material_keep_theme'); // ✅ Вместо storageGet
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeIcon(theme);
}
