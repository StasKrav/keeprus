// ============================================
// MARKDOWN PARSER
// ============================================

function renderMarkdown(text, currentNoteId) {
    if (!text) return "";

    // ============================================
    // 1. ПОДГОТОВКА: защищаем существующие HTML-блоки
    // ============================================
    let html = text;
    const protectedBlocks = [];
    let blockIndex = 0;

    function protectBlock(content) {
        const marker = `__PROTECTED_${blockIndex}__`;
        protectedBlocks.push(content);
        blockIndex++;
        return marker;
    }

    // Защищаем существующие ссылки (если они уже есть в тексте)
    html = html.replace(/<span class="text-link"[^>]*>.*?<\/span>/gs, function(match) {
        return protectBlock(match);
    });

    // Защищаем изображения
    html = html.replace(/<img[^>]*>/gs, function(match) {
        return protectBlock(match);
    });

    // Защищаем SVG
    html = html.replace(/<svg[^>]*>.*?<\/svg>/gs, function(match) {
        return protectBlock(match);
    });

    // Защищаем блоки кода (чтобы не сломать markdown внутри)
    html = html.replace(/```([\s\S]*?)```/gs, function(match) {
        return protectBlock(match);
    });

    // Защищаем инлайн-код
    html = html.replace(/`([^`]+)`/g, function(match) {
        return protectBlock(match);
    });

    // ============================================
    // 2. СОЗДАЁМ НОВЫЕ УМНЫЕ ССЫЛКИ
    // ============================================

    // Вики-ссылки [[Заголовок]]
    if (currentNoteId && typeof renderWikiLinks === 'function') {
        html = renderWikiLinks(html, currentNoteId);
    }

    // @-менти
    if (currentNoteId && typeof renderMentions === 'function') {
        html = renderMentions(html, currentNoteId);
    }

    // Умные ссылки (совпадения по словам)
    if (currentNoteId && typeof renderTextWithLinks === 'function') {
        html = renderTextWithLinks(html, currentNoteId);
    }

    // ============================================
    // 3. ЗАЩИЩАЕМ ВНОВЬ СОЗДАННЫЕ ССЫЛКИ
    // ============================================

    html = html.replace(/<span class="text-link"[^>]*>.*?<\/span>/gs, function(match) {
        return protectBlock(match);
    });

    html = html.replace(/<img[^>]*>/gs, function(match) {
        return protectBlock(match);
    });

    html = html.replace(/<svg[^>]*>.*?<\/svg>/gs, function(match) {
        return protectBlock(match);
    });

    // ============================================
    // 4. ЭКРАНИРУЕМ ОСТАЛЬНОЙ HTML (безопасность)
    // ============================================

    html = window.escapeHtml(html);

    // ============================================
    // 5. ВОЗВРАЩАЕМ ЗАЩИЩЁННЫЕ БЛОКИ
    // ============================================

    protectedBlocks.forEach(function(block, index) {
        html = html.replace(`__PROTECTED_${index}__`, block);
    });

    // ============================================
    // 6. ОБЫЧНЫЙ MARKDOWN
    // ============================================

    // Изображения (новые, не защищённые)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="note-image">');

    // Заголовки
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Жирный, курсив, зачёркнутый
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

    // Инлайн-код (новый, не защищённый)
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Блоки кода (новые, не защищённые)
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // Списки
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, "<li>$2</li>");
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");

    // Оборачиваем списки в ul/ol
    html = html.replace(/(<li>[\s\S]*?<\/li>(\n?))+/g, function(match) {
        if (match.includes('<ol>') || match.includes('<ul>')) return match;
        // Проверяем, нумерованный ли список
        const isOrdered = match.includes('</li>') && /^\s*<li>/.test(match);
        return isOrdered ? '<ol>' + match + '</ol>' : '<ul>' + match + '</ul>';
    });

    // Цитаты
    html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

    // Горизонтальная линия
    html = html.replace(/^---$/gm, "<hr>");
    html = html.replace(/^\*\*\*$/gm, "<hr>");

    // ============================================
    // 7. ФИНАЛЬНАЯ ОБРАБОТКА
    // ============================================

    // Обработка переносов строк и параграфов
    // Разбиваем на блоки по пустым строкам
    const paragraphs = html.split(/\n\n+/);
    let processed = [];

    for (let i = 0; i < paragraphs.length; i++) {
        let block = paragraphs[i].trim();
        if (!block) continue;

        // Проверяем, не является ли блок уже HTML-тегом
        const isHtmlBlock = /^<(h[1-6]|ul|ol|blockquote|pre|hr|p|span|img|div)/.test(block);

        if (isHtmlBlock) {
            processed.push(block);
        } else if (block.startsWith('<li>')) {
            // Списки уже обработаны
            processed.push(block);
        } else {
            // Обычный текст -> оборачиваем в <p>
            block = block.replace(/\n/g, "<br>");
            processed.push("<p>" + block + "</p>");
        }
    }

    html = processed.join("\n");

    // ============================================
    // 8. DOMPurify - финальная очистка
    // ============================================

    if (typeof DOMPurify !== 'undefined') {
        html = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'del',
                'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'hr',
                'span', 'svg', 'path', 'polyline', 'line', 'circle',
                'rect', 'polygon', 'a', 'img', 'div'
            ],
            ALLOWED_ATTR: [
                'href', 'src', 'alt', 'title', 'class', 'id',
                'data-note-id', 'onclick', 'style',
                'width', 'height', 'viewBox', 'fill', 'stroke',
                'stroke-width', 'stroke-linecap', 'stroke-linejoin',
                'xmlns', 'd', 'points', 'cx', 'cy', 'r', 'x1', 'y1',
                'x2', 'y2', 'x', 'y'
            ],
            ALLOW_DATA_ATTR: true
        });
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

    // Вырезаем картинку из контента
    let imageHtml = '';
    let textHtml = renderedContent;
    const imgMatch = renderedContent.match(/<img[^>]+>/);
    if (imgMatch) {
        imageHtml = imgMatch[0];
        textHtml = renderedContent.replace(imgMatch[0], '');
    }

    // ============================================
    // ПОХОЖИЕ ЗАМЕТКИ
    // ============================================
    
    let similarHtml = '';
    if (typeof renderSimilarNotesBlock === 'function' && !note.trashed && !note.archived) {
        similarHtml = renderSimilarNotesBlock(note);
    }

    // ============================================
    // ТЭГИ С АВТО-СВЁРТЫВАНИЕМ
    // ============================================
    
    let tagsHtml = '';
    if (note.tags && note.tags.length > 0) {
        // Используем функцию из tag.js для умного отображения
        if (typeof createTagsWithMore === 'function') {
            tagsHtml = createTagsWithMore(note);
        } else {
            // Fallback
            tagsHtml = note.tags.map(tag => `
                <span class="note-tag" data-tag="${escapeHtml(tag)}" title="${escapeHtml(tag)}">
                    <span class="tag-text" onclick="filterByTag('${escapeHtml(tag)}', event)">${escapeHtml(tag)}</span>
                    <span class="tag-remove" onclick="event.stopPropagation(); removeTagFromCard(${note.id}, '${escapeHtml(tag)}', event)" title="Удалить ярлык">×</span>
                </span>
            `).join('');
        }
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
    
    let html = '';
    
    if (imageHtml) {
        html += `<div class="note-image-wrapper">${imageHtml}</div>`;
    }
    
    if (note.title) {
        html += `<div class="note-title">${escapeHtml(note.title)}</div>`;
    }
    
    if (textHtml.trim()) {
        html += `<div class="note-content">${textHtml}</div>`;
    }
    
    html += similarHtml;
    
    if (reminderHtml) {
        html += `<div style="padding: 0 16px;">${reminderHtml}</div>`;
    }
    
    contentWrapper.innerHTML = html;

    // ============================================
    // ⭐ НИЖНИЙ КОНТЕЙНЕР (ТЭГИ + ДЕЙСТВИЯ) — ФИКСИРОВАННОЕ РАССТОЯНИЕ
    // ============================================
    
    const bottomContainer = document.createElement("div");
    bottomContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        min-height: 76px;
        padding: 0 16px 2px 16px;
        margin-top: auto;
        flex-shrink: 0;
    `;

    // Собираем тэги и действия в bottomContainer
    bottomContainer.innerHTML = `
        ${tagsHtml ? `<div class="note-tags" style="padding: 4px 0 0 0;">${tagsHtml}</div>` : `<div class="note-tags" style="padding: 4px 0 6px 0; min-height: 28px;"></div>`}
        <div class="note-actions" style="padding: 2px 0 0 0; min-height: 36px; display: flex; align-items: center; gap: 4px;">${actionsHtml}</div>
    `;

    // Добавляем bottomContainer в contentWrapper
    contentWrapper.appendChild(bottomContainer);
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
