// ============================================
// SEARCH
// ============================================

function setupSearch() {
  const input = document.getElementById("searchInput");
  let timeout;
  input.addEventListener("input", (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      searchTerm = e.target.value;
      renderNotes();
    }, 300);
  });

  // Clear search on Escape
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      searchTerm = "";
      renderNotes();
      input.blur();
    }
  });
}
