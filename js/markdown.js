// ============================================
// MARKDOWN PARSER
// ============================================

function escapeHtml(str) {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (!text) return "";

  // Escape HTML to prevent XSS — do this FIRST, before any tag injection
  let html = escapeHtml(text);

  // Headers: ## Title or # Title
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Code blocks: ```code```
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // Ordered lists: 1. item — process BEFORE unordered to avoid <li> conflicts
  html = html.replace(/^\d+\. (.+)$/gm, "<oli>$1</oli>");
  // Wrap consecutive <oli> in <ol>, converting markers to real <li>
  html = html.replace(/(<oli>[\s\S]*?<\/oli>(\n?))+/g, (match) => {
    return '<ol>' + match.replace(/<\/?oli>/g, (m) => m === '<oli>' ? '<li>' : '</li>') + '</ol>';
  });

  // Unordered lists: - item or * item
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>(\n?))+/g, (match) => `<ul>${match}</ul>`);

  // Blockquotes: > text
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Horizontal rule: --- or ***
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/^\*\*\*$/gm, "<hr>");

  // Line breaks: double newline = paragraph
  html = html.replace(/\n\n/g, "</p><p>");

  // Single line breaks
  html = html.replace(/\n/g, "<br>");

  // Wrap in paragraph if not already wrapped in block-level tags
  if (
    !html.startsWith("<h") &&
    !html.startsWith("<ul") &&
    !html.startsWith("<ol") &&
    !html.startsWith("<blockquote") &&
    !html.startsWith("<pre") &&
    !html.startsWith("<p>") &&
    !html.startsWith("<hr")
  ) {
    html = "<p>" + html + "</p>";
  }

  return html;
}

function createNoteElement(note) {
    const div = document.createElement("div");
    div.className = `note-card ${note.color} ${note.pinned ? "pinned" : ""}`;
    div.setAttribute("data-id", note.id);

    // ===== МАГНИТ =====
    const magnet = document.createElement("div");
    magnet.className = "note-magnet";
    magnet.title = note.pinned ? "Открепить" : "Закрепить";

    
    // === ИСПРАВЛЕНИЕ: добавляем обработчик напрямую на магнит ===
    // Сохраняем ID в data-атрибут
    magnet.dataset.noteId = note.id;


    // ===== ОСТАЛЬНОЕ СОДЕРЖИМОЕ =====
    const isTrash = currentFilter === "trash";

    const contentPreview =
        note.content.length > 120
            ? note.content.slice(0, 120) + "..."
            : note.content;
    const renderedContent = renderMarkdown(contentPreview);

    // Контейнер для содержимого
    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "position:relative;z-index:1;flex:1;display:flex;flex-direction:column;";
    
    contentWrapper.innerHTML = `
        <div class="note-title">${note.title || "Без названия"}</div>
        <div class="note-content md-content">${renderedContent}</div>
        <div class="note-footer">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <div class="note-tags">
                    ${note.tags
                      .map(
                        (tag) => `
                        <span class="note-tag" onclick="filterByTag('${tag}', event)">
                            ${tag}
                            <span class="tag-remove" onclick="removeTagFromCard(${note.id}, '${tag}', event)">&times;</span>
                        </span>
                    `,
                      )
                      .join("")}
                </div>
                <span class="note-date">${note.date || ""}</span>
            </div>
            <div class="note-actions">
                ${
                  isTrash
                    ? `
                    <button class="action-button" onclick="restoreNote(${note.id}, event)">
                        <span class="material-icons">restore</span>
                    </button>
                    <button class="action-button" onclick="deletePermanently(${note.id}, event)">
                        <span class="material-icons">delete_forever</span>
                    </button>
                `
                    : `
                    <button class="action-button" onclick="changeNoteColor(${note.id}, event)">
                        <span class="material-icons">palette</span>
                    </button>
                    <button class="action-button" onclick="archiveNote(${note.id}, event)">
                        <span class="material-icons">archive</span>
                    </button>
                    <button class="action-button" onclick="deleteNote(${note.id}, event)">
                        <span class="material-icons">delete</span>
                    </button>
                `
                }
            </div>
        </div>
    `;

    // Собираем всё вместе
    div.appendChild(magnet);
    div.appendChild(contentWrapper);

    // Клик по заметке для редактирования (кроме клика по магниту)
    div.addEventListener("dblclick", function(e) {
        // Проверяем, что клик не по магниту и не по его дочерним элементам
        if (e.target.closest('.note-magnet')) {
            return; // Если клик по магниту - ничего не делаем
        }
        
        if (!e.target.closest(".action-button") && 
            !e.target.closest(".note-tag")) {
            if (!isTrash) {
                editNote(note.id);
            }
        }
    });

    return div;
}
