// ============================================
// RENDER ENGINE
// ============================================

function getFilteredNotes() {
  let filtered = notes.filter((n) => !n.trashed);

  if (currentFilter === "pinned") {
    filtered = filtered.filter((n) => n.pinned);
  } else if (currentFilter === "archive") {
    filtered = filtered.filter((n) => n.archived);
  } else if (currentFilter === "trash") {
    filtered = notes.filter((n) => n.trashed);
  } else {
    filtered = filtered.filter((n) => !n.archived);
  }

  // Search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(term) ||
        n.content.toLowerCase().includes(term) ||
        n.tags.some((t) => t.toLowerCase().includes(term)),
    );
  }

  // Tag filter
  if (tagFilter) {
    filtered = filtered.filter((n) => n.tags.includes(tagFilter));
  }

  return filtered;
}

function renderNotes() {
  const container = document.getElementById("notesContainer");
  const filtered = getFilteredNotes();

  if (filtered.length === 0) {
    container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
            ${currentFilter === 'trash' ? `
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                </svg>
            ` : `
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v4"/>
                    <path d="M12 18v4"/>
                    <path d="M4.93 4.93l2.83 2.83"/>
                    <path d="M16.24 16.24l2.83 2.83"/>
                    <path d="M2 12h4"/>
                    <path d="M18 12h4"/>
                    <path d="M4.93 19.07l2.83-2.83"/>
                    <path d="M16.24 7.76l2.83-2.83"/>
                </svg>
            `}
            <h2>${currentFilter === 'trash' ? 'Корзина пуста' : 'Нет заметок'}</h2>
            <p>${currentFilter === 'trash' ? 'Удаленные заметки будут здесь' : 'Создайте новую заметку, нажав на кнопку +'}</p>
        </div>
    `;
    return;
  }

  container.innerHTML = "";

  // Show pinned first (except in pinned or trash view)
  let sorted = [...filtered];
  if (currentFilter !== "pinned" && currentFilter !== "trash") {
    sorted.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.id - a.id;
    });
  } else {
    sorted.sort((a, b) => b.id - a.id);
  }

  sorted.forEach((note) => {
    container.appendChild(createNoteElement(note));
  });

  // Update title
  const titleMap = {
    all: "Все заметки",
    pinned: "Закрепленные",
    archive: "Архив",
    trash: "Корзина",
  };
  const title = document.getElementById("notesTitle");
  title.innerHTML = `${titleMap[currentFilter] || "Все заметки"} <span class="notes-count">(${filtered.length})</span>`;
}
