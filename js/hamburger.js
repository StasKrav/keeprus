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
                <span class="menu-label">Сохранить как...</span>
            </button>
            
            <button class="menu-item" onclick="openNotesFile(); closeHamburgerMenu();">
                <span class="menu-label">Открыть файл</span>
            </button>
        </div>
        
        <div class="menu-section">
            <button class="menu-item" onclick="clearTrash(); closeHamburgerMenu();">
                <span class="menu-label">Очистить корзину</span>
            </button>
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
