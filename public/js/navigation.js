
// ============================================
// FILTERS & NAVIGATION
// ============================================

function filterNotes(filter) {
  currentFilter = filter;
  tagFilter = null;
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  const target = document.querySelector(`.nav-item[data-filter="${filter}"]`);
  if (target) target.classList.add("active");
  renderNotes();
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

// Патчим renderNotes для обновления статистики
const originalRenderNotes = window.renderNotes;
if (originalRenderNotes) {
    window.renderNotes = function() {
        originalRenderNotes.apply(this, arguments);
        updateStatsIfVisible();
    };
}
