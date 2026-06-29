// ============================================
// ФИЛЬТР ПО ЦВЕТУ ЗАМЕТОК
// ============================================

const COLOR_NAMES = {
    'color-default': 'Без цвета',
    'color-red': 'Красный',
    'color-orange': 'Оранжевый',
    'color-yellow': 'Жёлтый',
    'color-green': 'Зелёный',
    'color-teal': 'Бирюзовый',
    'color-blue': 'Синий',
    'color-purple': 'Фиолетовый'
};

let currentColorFilter = null;

function getColorStats() {
    const stats = {};
    const activeNotes = notes.filter(n => !n.trashed && !n.archived);
    
    for (const [key, name] of Object.entries(COLOR_NAMES)) {
        stats[key] = { name: name, count: 0, color: key };
    }
    
    activeNotes.forEach(n => {
        const color = n.color || 'color-default';
        if (stats[color]) {
            stats[color].count++;
        }
    });
    
    return stats;
}

function renderColorFilter() {
    const container = document.getElementById('colorFilterList');
    if (!container) return;
    
    const stats = getColorStats();
    const total = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
    
    if (total === 0) {
        container.innerHTML = '<div class="color-filter-empty">Нет заметок</div>';
        return;
    }
    
    let html = '';
    
    for (const [key, data] of Object.entries(stats)) {
        if (data.count === 0) continue;
        
        const isActive = currentColorFilter === key;
        
        html += `
            <button class="color-filter-item ${isActive ? 'active' : ''}" 
                    data-color="${key}"
                    onclick="filterByColor('${key}')">
                <span class="color-filter-dot ${key}"></span>
                <span class="color-filter-name">${data.name}</span>
                <span class="color-filter-count">${data.count}</span>
            </button>
        `;
    }
    
    if (currentColorFilter) {
        html += `
            <button class="color-filter-item color-filter-clear" onclick="clearColorFilter()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span class="color-filter-name">Сбросить фильтр</span>
            </button>
        `;
    }
    
    container.innerHTML = html;
}

function filterByColor(color) {
    if (currentColorFilter === color) {
        clearColorFilter();
        return;
    }
    
    currentColorFilter = color;
    
    document.querySelectorAll('.color-filter-item').forEach(el => {
        el.classList.toggle('active', el.dataset.color === color);
    });
    
    applyFilters();
}

function clearColorFilter() {
    currentColorFilter = null;
    
    document.querySelectorAll('.color-filter-item').forEach(el => {
        el.classList.remove('active');
    });
    
    applyFilters();
}

function applyFilters() {
    window._colorFilter = currentColorFilter;
    
    // Полная перерисовка с очисткой кэша
    if (typeof clearCardCache === 'function') {
        clearCardCache();
    }
    
    renderNotes();
    renderColorFilter();
}

// Патчим getFilteredNotes
const originalGetFilteredNotes = window.getFilteredNotes;
if (originalGetFilteredNotes) {
    window.getFilteredNotes = function() {
        let filtered = originalGetFilteredNotes();
        
        if (currentColorFilter) {
            filtered = filtered.filter(n => {
                const noteColor = n.color || 'color-default';
                return noteColor === currentColorFilter;
            });
        }
        
        return filtered;
    };
}

// Патчим updateCounts
const originalUpdateCounts = window.updateCounts;
if (originalUpdateCounts) {
    window.updateCounts = function() {
        originalUpdateCounts();
        renderColorFilter();
    };
}

// ============================================
// СВОРАЧИВАНИЕ/РАЗВОРАЧИВАНИЕ
// ============================================

function toggleColorFilter() {
    const content = document.getElementById('colorFilterContent');
    const icon = document.querySelector('.section-toggle-icon');
    
    if (!content) return;
    
    const isOpen = content.style.display !== 'none';
    
    if (isOpen) {
        content.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(-90deg)';
        localStorage.setItem('keeprus_color_filter_open', 'false');
    } else {
        content.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(0deg)';
        localStorage.setItem('keeprus_color_filter_open', 'true');
    }
}

function loadColorFilterState() {
    const isOpen = localStorage.getItem('keeprus_color_filter_open');
    const content = document.getElementById('colorFilterContent');
    const icon = document.querySelector('.section-toggle-icon');
    
    if (!content || !icon) return;
    
    if (isOpen === 'false') {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
    } else {
        content.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
    }
}

// Экспорт
window.filterByColor = filterByColor;
window.clearColorFilter = clearColorFilter;
window.renderColorFilter = renderColorFilter;
window.getColorStats = getColorStats;
window.toggleColorFilter = toggleColorFilter;
window.loadColorFilterState = loadColorFilterState;

console.log('🎨 Фильтр по цвету загружен');
