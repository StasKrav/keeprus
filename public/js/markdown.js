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

    // Экранируем HTML
    let html = escapeHtml(text);

    // 0. Изображения
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="note-image">');

    // 1. Заголовки
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // 2. Жирный
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // 3. Курсив
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");

    // 4. Зачёркнутый
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

    // 5. Встроенный код
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 6. Блок кода
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // 7. Списки
    html = html.replace(/^\d+\. (.+)$/gm, "<oli>$1</oli>");
    html = html.replace(/(<oli>[\s\S]*?<\/oli>(\n?))+/g, (match) => {
        return '<ol>' + match.replace(/<\/?oli>/g, (m) => m === '<oli>' ? '<li>' : '</li>') + '</ol>';
    });

    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>[\s\S]*?<\/li>(\n?))+/g, (match) => `<ul>${match}</ul>`);

    // 8. Цитаты
    html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

    // 9. Горизонтальная линия
    html = html.replace(/^---$/gm, "<hr>");
    html = html.replace(/^\*\*\*$/gm, "<hr>");

    // 10. Параграфы и переносы
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");

    // Оборачиваем в параграф
    if (!html.startsWith("<h") && !html.startsWith("<ul") && 
        !html.startsWith("<ol") && !html.startsWith("<blockquote") && 
        !html.startsWith("<pre") && !html.startsWith("<p>") && 
        !html.startsWith("<hr")) {
        html = "<p>" + html + "</p>";
    }

    // ⭐ КРИТИЧЕСКИ ВАЖНО: Очистка от XSS
    if (typeof DOMPurify !== 'undefined') {
        html = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'br', 'strong', 'em', 'del',
                'ul', 'ol', 'li',
                'code', 'pre',
                'blockquote', 'hr',
                'a', 'img'
            ],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
        });
    } else {
        // Fallback
        html = html.replace(/<script.*?>.*?<\/script>/gi, '');
        html = html.replace(/on\w+\s*=/gi, '');
        html = html.replace(/javascript:/gi, '');
    }

    return html;
}

function createNoteElement(note) {
    const div = document.createElement("div");
    div.className = `note-card ${note.color} ${note.pinned ? "pinned" : ""}`;
    div.setAttribute("data-id", note.id);

    // ✅ ДОБАВЛЯЕМ БУЛАВКУ (SVG) В ПРАВЫЙ УГОЛ
    const pinIcon = document.createElement('div');
    pinIcon.className = 'pin-icon';
    pinIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 352 448">
            <!-- Заливка (скрыта по умолчанию) -->
            <path d="M112,80 L240,80 L240,208 L272,272 L80,272 L112,208 Z" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="32" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"/>
            <!-- Нижняя часть булавки -->
            <path d="M176,304 L176,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
        </svg>
    `;

    pinIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePin(note.id, e);
    });   
    

    const isTrash = currentFilter === "trash";

    // ⭐ УВЕЛИЧИВАЕМ КОЛИЧЕСТВО ТЕКСТА: 120 → 250 символов
    const contentPreview = note.content.length > 250 
        ? note.content.slice(0, 250) + "..." 
        : note.content;
    const renderedContent = renderMarkdown(contentPreview);

    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "position:relative;z-index:1;flex:1;display:flex;flex-direction:column;";
    
    const contentHtml = renderedContent;
    
    // Проверяем, есть ли картинка в содержимом
    const hasImage = contentHtml.includes('<img');
    
    contentWrapper.innerHTML = `
        ${hasImage ? contentHtml : `
            ${note.title ? `<div class="note-title">${note.title}</div>` : ''}
            <div class="note-content md-content note-preview">${contentHtml}</div>
        `}
        <div class="note-footer">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <div class="note-tags">
                    ${note.tags
                      .map(
                        (tag) => `
                        <span class="note-tag" onclick="filterByTag('${tag}', event)">
                            <span class="tag-text">${tag}</span>
                            <span class="tag-remove" onclick="removeTagFromCard(${note.id}, '${tag}', event)">&times;</span>
                        </span>
                    `,
                      )
                      .join("")}
                </div>
            </div>
            <div class="note-actions">
                ${
                  isTrash
                    ? `
                    <button class="action-button" onclick="restoreNote(${note.id}, event)">
                        <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M258,218 L258,346" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M255,217 L191,281" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M260,219 L324,283" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        </svg>
                        
                    </button>
                    <button class="action-button" onclick="deletePermanently(${note.id}, event)">
                        <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M208,240 L304,336" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M304,240 L208,336" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        </svg>
                        
                    </button>
                `
                    : `
                    <button class="action-button" onclick="changeNoteColor(${note.id}, event)">
                        <svg width="20" height="20" viewBox="0 0 608 576" xmlns="http://www.w3.org/2000/svg">
                        <path d="M272,80 C432,80 528,176 432,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M272,80 C176,80 80,144 80,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M304,368 L304,496" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M304,368 L432,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <circle cx="308" cy="171" r="21.377558326431952" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                        <circle cx="400" cy="240" r="20.591260281974" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                        <circle cx="193" cy="209" r="23.021728866442675" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                        <circle cx="162" cy="323" r="22.203603311174515" stroke="currentColor" stroke-width="32" fill="#3b82f6"/>
                        <path d="M80,272 C80,368 176,496 304,496" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button class="action-button" onclick="archiveNote(${note.id}, event)" title="${note.archived ? 'Разархивировать' : 'Архивировать'}">
                        ${note.archived ? `
                            <!-- ИКОНКА РАЗАРХИВАЦИИ (стрелка вверх) -->
                            <svg width="20" height="20" viewBox="0 0 480 416">
                            <path d="M80,336 L400,336" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M80,336 L80,304" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M80,304 L80,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M400,336 L400,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M240,240 L240,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M240,80 L176,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M240,80 L304,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            </svg>
                        ` : `
                            <!-- ИКОНКА АРХИВАЦИИ (стрелка вниз) -->
                            <svg width="20" height="20" viewBox="0 0 416 352" xmlns="http://www.w3.org/2000/svg">
                            <path d="M208,80 L208,208" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M144,144 L208,208" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M208,208 L272,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M80,272 L336,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M336,272 L336,112" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M80,112 L80,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            </svg>
                            
                        `}
                    </button>
                    <button class="action-button" onclick="deleteNote(${note.id}, event)">
                        <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                        </svg>
                    </button>
                `
                }
            </div>
        </div>
    `;


    div.appendChild(pinIcon);
    div.appendChild(contentWrapper);

    div.addEventListener("dblclick", function(e) {
        if (e.target.closest('.pin-icon')) {  // ← исправлено
            return;
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

