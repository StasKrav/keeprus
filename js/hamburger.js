// ============================================
// ГАМБУРГЕР-МЕНЮ
// ============================================

function toggleHamburgerMenu() {
    const menu = document.getElementById('hamburgerMenu');
    const overlay = document.getElementById('hamburgerOverlay');
    const btn = document.getElementById('hamburgerBtn');
    
    if (!menu || !overlay || !btn) return;
    
    if (menu.classList.contains('visible')) {
        closeHamburgerMenu();
    } else {
        openHamburgerMenu();
    }
}

function openHamburgerMenu() {
    const menu = document.getElementById('hamburgerMenu');
    const overlay = document.getElementById('hamburgerOverlay');
    const btn = document.getElementById('hamburgerBtn');
    
    if (!menu || !overlay || !btn) return;
    
    // Обновляем содержимое перед открытием
    updateMenuContent();
    
    menu.classList.add('visible');
    overlay.classList.add('visible');
    btn.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHamburgerMenu() {
    const menu = document.getElementById('hamburgerMenu');
    const overlay = document.getElementById('hamburgerOverlay');
    const btn = document.getElementById('hamburgerBtn');
    
    if (!menu || !overlay || !btn) return;
    
    menu.classList.remove('visible');
    overlay.classList.remove('visible');
    btn.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// ОБНОВЛЕНИЕ СОДЕРЖИМОГО МЕНЮ (БЕЗ ЭМОДЗИ)
// ============================================

function updateMenuContent() {
    const container = document.querySelector('.hamburger-menu-content');
    if (!container) return;
    
    const noteCount = notes ? notes.length : 0;
    
    container.innerHTML = `
        <div class="menu-section">
            <button class="menu-item" onclick="saveNotesAs(); closeHamburgerMenu();">
                <span class="menu-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                    </svg>
                </span>
                <span class="menu-label">Сохранить как...</span>
            </button>
            
            <button class="menu-item" onclick="openNotesFile(); closeHamburgerMenu();">
                <span class="menu-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
                        <polyline points="8 12 12 16 16 12"/>
                        <line x1="12" y1="2" x2="12" y2="16"/>
                    </svg>
                </span>
                <span class="menu-label">Открыть файл</span>
            </button>
        </div>
        
        <div class="menu-divider"></div>
        
        <div class="menu-section">
            <button class="menu-item" onclick="clearTrash(); closeHamburgerMenu();">
                <span class="menu-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                        <path d="M10 11v6"/>
                        <path d="M14 11v6"/>
                    </svg>
                </span>
                <span class="menu-label">Очистить корзину</span>
            </button>
        </div>
        
        <div class="menu-divider"></div>
        
        <div class="menu-section">
            <div class="menu-item info-item">
                <span class="menu-label" style="font-size: 12px; color: var(--text-secondary);">
                    заметок  ${noteCount}
                </span>
            </div>
        </div>
    `;
}

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeHamburgerMenu();
    }
});

// Закрытие при клике вне меню
document.addEventListener('click', function(e) {
    const menu = document.getElementById('hamburgerMenu');
    const btn = document.getElementById('hamburgerBtn');
    
    if (!menu || !btn) return;
    
    if (menu.classList.contains('visible')) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            closeHamburgerMenu();
        }
    }
});
