// ============================================
// MARKDOWN PARSER
// ============================================

// escapeHtml определён в render-optimized.js (window.escapeHtml)
// Используем его напрямую — он гарантированно доступен к моменту вызова renderMarkdown

function renderMarkdown(text, currentNoteId) {
    if (!text) return "";

    // Экранируем HTML (функция из render-optimized.js)
    let html = window.escapeHtml(text);
    
    // Умные ссылки (если передан ID заметки)
    if (currentNoteId && typeof renderTextWithLinks === 'function') {
        html = renderTextWithLinks(html, currentNoteId);
    }

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
    div.draggable = true;

    // Булавка
    const pinIcon = document.createElement('div');
    pinIcon.className = 'pin-icon';
    pinIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 352 448">
            <path d="M112,80 L240,80 L240,208 L272,272 L80,272 L112,208 Z" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="32" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"/>
            <path d="M176,304 L176,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
        </svg>
    `;

    pinIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePin(note.id, e);
    });

    const isTrash = currentFilter === "trash";

    // ============================================
    // РЕНДЕРИМ КОНТЕНТ
    // ============================================
    
    const contentPreview = note.content.length > 250 
        ? note.content.slice(0, 250) + "..." 
        : note.content;
    
    let renderedContent = renderMarkdown(contentPreview, note.id);

    // ⬇️⬇️⬇️ ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ ⬇️⬇️⬇️
    // Вырезаем картинку из контента
    let imageHtml = '';
    let textHtml = renderedContent;
    const imgMatch = renderedContent.match(/<img[^>]+>/);
    if (imgMatch) {
        imageHtml = imgMatch[0];
        textHtml = renderedContent.replace(imgMatch[0], '');
    }
    // ⬆️⬆️⬆️ КОНЕЦ ИЗМЕНЕНИЯ ⬆️⬆️⬆️

    // ============================================
    // ПОХОЖИЕ ЗАМЕТКИ
    // ============================================
    
    let similarHtml = '';
    if (typeof renderSimilarNotesBlock === 'function' && !note.trashed && !note.archived) {
        similarHtml = renderSimilarNotesBlock(note);
    }

    // ============================================
    // ТЭГИ
    // ============================================
    
    let tagsHtml = '';
    if (note.tags && note.tags.length > 0) {
        tagsHtml = note.tags.map(tag => `
            <span class="note-tag" data-tag="${escapeHtml(tag)}">
                <span class="tag-text" onclick="filterByTag('${escapeHtml(tag)}', event)">${escapeHtml(tag)}</span>
                <span class="tag-remove" onclick="event.stopPropagation(); removeTagFromCard(${note.id}, '${escapeHtml(tag)}', event)" title="Удалить ярлык">×</span>
            </span>
        `).join('');
    }
    // ============================================
    // НАПОМИНАНИЕ
    // ============================================
    
    let reminderHtml = '';
    if (note.reminder) {
        reminderHtml = `
            <div class="note-reminder">
                <svg width="18" height="18" viewBox="0 0 416 501" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round">
                    <path d="M112,213 C144,117 272,117 304,213"/>
                    <path d="M112,208 L112,368"/>
                    <path d="M304,208 L304,368"/>
                    <path d="M80,368 L336,368"/>
                    <path d="M208,80 L208,112"/>
                    <path d="M176,400 C196,421 223,419 240,400"/>
                </svg>
                <span class="reminder-text">${note.reminder.date} ${note.reminder.time}</span>
                <button class="reminder-delete" onclick="event.stopPropagation(); removeReminderFromCard(${note.id})" title="Удалить напоминание">✕</button>
            </div>
        `;
    }

    // ============================================
    // КНОПКИ
    // ============================================
    
    let actionsHtml = '';
    
    if (isTrash) {
        actionsHtml = `
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
        `;
    } else {
        actionsHtml = `
            <button class="action-button" onclick="changeNoteColor(${note.id}, event)" title="Сменить цвет">
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
            <button class="action-button" onclick="showReminderModal(${note.id}, event)" title="Напоминание">
                <svg width="24" height="24" viewBox="0 0 416 501">
                    <path d="M112,213 C144,117 272,117 304,213" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M112,208 L112,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M304,208 L304,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M80,368 L336,368" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M208,80 L208,112" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M176,400 C196,421 223,419 240,400" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                </svg>
            </button>
            <button class="action-button" onclick="deleteNote(${note.id}, event)" title="Удалить">
                <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                    <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                    <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                </svg>
            </button>
        `;
    }

    // ============================================
    // СБОРКА
    // ============================================
    
    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "position:relative;z-index:1;flex:1;display:flex;flex-direction:column;";
    
    // ⬇️⬇️⬇️ СБОРКА С КАРТИНКОЙ ⬇️⬇️⬇️
    let html = '';
    
    if (imageHtml) {
        html += `<div class="note-image-wrapper">${imageHtml}</div>`;
    }
    
    if (note.title) {
        html += `<div class="note-title">${note.title}</div>`;
    }
    
    if (textHtml.trim()) {
        html += `<div class="note-content">${textHtml}</div>`;
    }
    
    html += similarHtml;
    
    if (reminderHtml) {
        html += `<div style="padding: 0 16px;">${reminderHtml}</div>`;
    }
    
    if (tagsHtml) {
        html += `<div class="note-tags">${tagsHtml}</div>`;
    }
    
    html += `<div class="note-actions">${actionsHtml}</div>`;
    
    contentWrapper.innerHTML = html;
    // ⬆️⬆️⬆️ КОНЕЦ СБОРКИ ⬆️⬆️⬆️

    div.appendChild(pinIcon);
    div.appendChild(contentWrapper);

    // Двойной клик
    div.addEventListener("dblclick", function(e) {
        if (e.target.closest('.pin-icon')) return;
        if (e.target.closest('.text-link')) return;
        if (!e.target.closest(".action-button") && 
            !e.target.closest(".note-tag")) {
            if (currentFilter !== "trash") {
                editNote(note.id);
            }
        }
    });

    return div;
}
