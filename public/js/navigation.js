
// ============================================
// FILTERS & NAVIGATION
// ============================================

// ============================================
// ФИЛЬТРЫ И НАВИГАЦИЯ
// ============================================

function filterNotes(filter) {
    currentFilter = filter;
    tagFilter = null;
    currentColorFilter = null;
    
    document.querySelectorAll(".nav-item").forEach((el) => 
        el.classList.remove("active")
    );
    
    const target = document.querySelector(`.nav-item[data-filter="${filter}"]`);
    if (target) target.classList.add("active");
    
    document.querySelectorAll('.color-filter-item').forEach(el => {
        el.classList.remove('active');
    });
    
    applyAllFilters();
}

function applyAllFilters() {
    if (typeof clearCardCache === 'function') {
        clearCardCache();
    }
    renderNotes();
    updateCounts();
}

function updateCounts() {
    const all = notes.filter((n) => !n.trashed && !n.archived).length;
    const pinned = notes.filter(
        (n) => n.pinned && !n.trashed && !n.archived,
    ).length;
    const archived = notes.filter((n) => n.archived && !n.trashed).length;
    const trashed = notes.filter((n) => n.trashed).length;

    document.getElementById("countAll").textContent = all;
    document.getElementById("countPinned").textContent = pinned;
    document.getElementById("countArchive").textContent = archived;
    document.getElementById("countTrash").textContent = trashed;

    renderTags();
    
    // Обновляем фильтр по цвету
    if (typeof renderColorFilter === 'function') {
        renderColorFilter();
    }
}
// ============================================
// СТАТИСТИКА — ОТКРЫТИЕ/ЗАКРЫТИЕ
// ============================================

let statsVisible = false;

function toggleStats() {
    const container = document.getElementById('statsContainer');
    const toggle = document.getElementById('statsToggle');
    
    statsVisible = !statsVisible;
    
    if (statsVisible) {
        container.style.display = 'block';
        toggle.classList.add('active');
        renderStats();
    } else {
        container.style.display = 'none';
        toggle.classList.remove('active');
    }
}

// Обновляем статистику при изменении заметок
function updateStatsIfVisible() {
    if (statsVisible) {
        renderStats();
    }
}

// renderNotes вызывает updateStatsIfVisible напрямую (в render-optimized.js)
