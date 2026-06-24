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
  document.getElementById("noteEditor").classList.remove("visible");
  document.getElementById("editorColorPicker").classList.remove("visible");
  document.getElementById("mdHint").style.display = "none";
  isMarkdownMode = false;
  document.getElementById("markdownBtn").classList.remove("active");
  document.getElementById("markdownIcon").textContent = "code";
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
