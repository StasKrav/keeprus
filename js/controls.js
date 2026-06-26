// ============================================
// EDITOR CONTROLS
// ============================================

function closeEditor() {
  if (hasUnsavedChanges) {
    document.getElementById("confirmDialog").classList.add("visible");
    return;
  }
  forceCloseEditor();
}

function forceCloseEditor() {
    // ⭐ УДАЛЯЕМ ПРЕВЬЮ MARKDOWN ПРИ ЗАКРЫТИИ
    const preview = document.getElementById("mdPreview");
    if (preview) {
        preview.remove(); // полностью удаляем из DOM
    }
    
    // ⭐ ВОЗВРАЩАЕМ textarea
    const content = document.getElementById("noteContent");
    content.style.display = "block";
    
    // ⭐ СБРАСЫВАЕМ РЕЖИМ MARKDOWN
    isMarkdownMode = false;
    document.getElementById("markdownBtn").classList.remove("active");
    document.getElementById("markdownIcon").textContent = "code";
    document.getElementById("mdHint").style.display = "none";
    
    // Остальное как было
    document.getElementById("noteEditor").classList.remove("visible");
    document.getElementById("editorColorPicker").classList.remove("visible");
    currentNoteId = null;
    hasUnsavedChanges = false;
}

function confirmSave() {
  document.getElementById("confirmDialog").classList.remove("visible");
  saveNote();
  forceCloseEditor();
}

function confirmDiscard() {
  document.getElementById("confirmDialog").classList.remove("visible");
  hasUnsavedChanges = false;
  forceCloseEditor();
}

function confirmCancel() {
  document.getElementById("confirmDialog").classList.remove("visible");
}
