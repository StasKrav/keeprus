// ============================================
// COLOR PICKER
// ============================================

function toggleEditorColorPicker() {
  const picker = document.getElementById("editorColorPicker");
  picker.classList.toggle("visible");
}

function setEditorColor(color) {
  currentColor = color;
  document.getElementById("noteEditorContent").style.backgroundColor =
    getColorValue(color);
  // Update active state in picker
  document
    .querySelectorAll("#editorColorPicker .color-option")
    .forEach((el) => {
      el.classList.toggle("active", el.classList.contains(color));
    });
  // Close picker
  document.getElementById("editorColorPicker").classList.remove("visible");
}

function getColorValue(color) {
  const map = {
    "color-default": "var(--note-default)",
    "color-red": "var(--note-red)",
    "color-orange": "var(--note-orange)",
    "color-yellow": "var(--note-yellow)",
    "color-green": "var(--note-green)",
    "color-teal": "var(--note-teal)",
    "color-blue": "var(--note-blue)",
    "color-purple": "var(--note-purple)",
  };
  // Для правильного отображения в редакторе нужно получить вычисленное значение
  const computedStyle = getComputedStyle(document.documentElement);
  return computedStyle.getPropertyValue(map[color]).trim() || "#ffffff";
}

function updateEditorColorPicker() {
  const bg = getColorValue(currentColor);
  document.getElementById("noteEditorContent").style.backgroundColor = bg;
  document
    .querySelectorAll("#editorColorPicker .color-option")
    .forEach((el) => {
      el.classList.toggle("active", el.classList.contains(currentColor));
    });
}
