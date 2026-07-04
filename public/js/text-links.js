// ============================================
// УМНЫЕ ССЫЛКИ В ТЕКСТЕ ЗАМЕТОК (исправленная версия)
// ============================================

function findNoteLinks(text, currentNoteId) {
    if (!text || text.length < 2) return [];
    
    // Разбиваем на слова
    const words = text.split(/[\s\n\r\t,.;:!?()"']+/);
    const found = [];
    const processed = new Set();
    
    const allNotes = notes.filter(function(n) {
        return n.id !== currentNoteId && !n.trashed && !n.archived;
    });
    
    words.forEach(function(word) {
        const clean = word.replace(/^[-]+/, '').replace(/[-]+$/, '').toLowerCase();
        
        // ✅ ПРОПУСКАЕМ ЧИСЛА
        if (/^[\d.,:]+$/.test(clean)) return;
        if (clean.length < 2) return;
        if (processed.has(clean)) return;
        
        // Точное совпадение
        const match = allNotes.find(function(n) {
            return n.title.toLowerCase() === clean;
        });
        
        if (match) {
            processed.add(clean);
            found.push({
                word: word,
                clean: clean,
                noteId: match.id,
                title: match.title,
                type: 'exact'
            });
            return;
        }
    });
    
    return found.slice(0, 5);
}

function renderTextWithLinks(text, currentNoteId) {
    if (!text) return text;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    const links = findNoteLinks(plainText, currentNoteId);
    if (links.length === 0) return text;
    
    let result = text;
    
    links.sort(function(a, b) {
        return b.word.length - a.word.length;
    });
    
    links.forEach(function(link) {
        const escaped = link.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // ✅ ИСПРАВЛЕНО: не трогаем числа с точками
        const regex = new RegExp('(?<![\\w.])' + escaped + '(?![\\w.])', 'gi');
        
        result = result.replace(regex, function(match) {
            return '<span class="text-link" onclick="openNoteFromLink(' + link.noteId + ', event)" ' +
                   'data-note-id="' + link.noteId + '" ' +
                   'title="Открыть заметку: ' + link.title + '">' +
                   match +
                   '<svg class="link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                   '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
                   '<polyline points="15 3 21 3 21 9"/>' +
                   '<line x1="10" y1="14" x2="21" y2="3"/>' +
                   '</svg>' +
                   '</span>';
        });
    });
    
    return result;
}

function openNoteFromLink(noteId, event) {
    event.stopPropagation();
    event.preventDefault();
    
    const note = notes.find(function(n) { return n.id === noteId; });
    if (!note) {
        showToast('Заметка не найдена');
        return;
    }
    
    if (document.getElementById('noteEditor').classList.contains('visible')) {
        closeEditor();
    }
    
    setTimeout(function() {
        editNote(noteId);
    }, 200);
}

function findSimilarNotes(text, currentNoteId, limit) {
    if (limit === undefined) limit = 3;
    if (!text || text.length < 10) return [];
    
    // 1. Извлекаем ключевые слова
    const words = text
        .toLowerCase()
        .split(/[\s\n\r\t,.;:!?()"']+/)
        .filter(function(w) { 
            if (w.length < 3) return false;
            if (/^[\d.,:]+$/.test(w)) return false;
            
            const stopWords = [
                'это', 'все', 'так', 'для', 'без', 'или', 'и', 
                'на', 'по', 'с', 'у', 'к', 'от', 'до', 'за', 
                'в', 'о', 'а', 'но', 'да', 'не', 'ни', 
                'что', 'как', 'еще', 'уже', 'можно', 'нужно', 
                'надо', 'будет', 'было', 'только', 'если', 
                'когда', 'потом', 'теперь', 'всегда', 'никогда',
                'сегодня', 'завтра', 'вчера', 'сейчас', 'потом',
                'тут', 'там', 'здесь', 'везде', 'нигде'
            ];
            return !stopWords.includes(w);
        });
    
    if (words.length === 0) return [];
    
    // 2. Обрабатываем имена (Анне → Анна, Кате → Катя)
    const processedWords = [];
    words.forEach(function(word) {
        // Имена в дательном падеже (Анне → Анна, Кате → Катя)
        if (word.endsWith('е') && word.length > 3) {
            const base = word.slice(0, -1) + 'а';
            processedWords.push(base);
            processedWords.push(word);
        } else if (word.endsWith('ы') && word.length > 3) {
            const base = word.slice(0, -1) + 'а';
            processedWords.push(base);
            processedWords.push(word);
        } else if (word.endsWith('ой') && word.length > 4) {
            const base = word.slice(0, -2) + 'а';
            processedWords.push(base);
            processedWords.push(word);
        } else {
            processedWords.push(word);
        }
    });
    
    // 3. Убираем дубликаты
    const uniqueWords = [...new Set(processedWords)];
    
    // 4. Для каждой заметки считаем релевантность
    const allNotes = notes.filter(function(n) {
        return n.id !== currentNoteId && !n.trashed && !n.archived;
    });
    
    const scored = allNotes.map(function(note) {
        const noteText = (note.title + ' ' + note.content).toLowerCase();
        let score = 0;
        let matches = [];
        
        uniqueWords.forEach(function(word) {
            // ✅ ИСПРАВЛЕНИЕ: проверяем наличие слова в тексте заметки
            if (noteText.includes(word)) {
                const titleBonus = note.title && note.title.toLowerCase().includes(word) ? 10 : 0;
                const contentBonus = note.content && note.content.toLowerCase().includes(word) ? 5 : 0;
                const lengthBonus = Math.min(word.length, 5);
                
                // ✅ ИСПРАВЛЕНИЕ: безопасный подсчёт частоты
                let freqInText = 0;
                try {
                    // Экранируем спецсимволы для RegExp
                    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(escapedWord, 'g');
                    const matches = text.match(regex);
                    freqInText = matches ? matches.length : 0;
                } catch (e) {
                    freqInText = 0;
                }
                
                const rarityBonus = Math.max(1, 5 - freqInText);
                const wordScore = 5 + titleBonus + contentBonus + lengthBonus + rarityBonus;
                score += wordScore;
                matches.push(word);
            }
        });
        
        // Бонус за общие теги
        const currentNote = notes.find(function(n) { return n.id === currentNoteId; });
        if (currentNote && currentNote.tags && note.tags) {
            const commonTags = currentNote.tags.filter(function(t) {
                return note.tags.includes(t);
            });
            if (commonTags.length > 0) {
                score += commonTags.length * 25;
            }
        }
        
        return { 
            ...note, 
            score: score, 
            matches: matches,
            matchCount: matches.length 
        };
    });
    
    // 5. Сортируем и фильтруем
    const sorted = scored
        .filter(function(n) { 
            const hasCommonTags = n.score > 25;
            const result = n.matchCount >= 2 || hasCommonTags;
            return result;
        })
        .sort(function(a, b) { 
            return b.score - a.score; 
        })
        .slice(0, limit);
    
    return sorted;
}

function renderSimilarNotesBlock(note) {
    // Проверка: есть ли контент для поиска похожих
    if (!note || !note.content || note.content.length < 10) return '';
    
    try {
        const similar = findSimilarNotes(note.content, note.id, 5);
        
        if (similar.length === 0) return '';
        
        // Ограничиваем количество отображаемых
        const maxDisplay = 4;
        const displaySimilar = similar.slice(0, maxDisplay);
        const hasMore = similar.length > maxDisplay;
        
        let html = '<div class="note-similar">';
        html += '<div class="note-similar-list">';
        
        displaySimilar.forEach(function(n) {
            let title = n.title || 'Без названия';
            if (title.length > 18) {
                title = title.slice(0, 16) + '…';
            }
            html += '<span class="note-similar-item" onclick="openNoteFromLink(' + n.id + ', event)" title="' + escapeHtml(n.title || 'Без названия') + '">';
            html += escapeHtml(title);
            html += '</span>';
        });
        
        if (hasMore) {
            html += '<span class="note-similar-more" onclick="showAllSimilarNotes(' + note.id + ', event)">+' + (similar.length - maxDisplay) + '</span>';
        }
        
        html += '</div>';
        html += '</div>';
        
        return html;
    } catch (e) {
        console.warn('Ошибка при рендере похожих заметок:', e);
        return '';
    }
}

// ============================================
// ПОКАЗ ВСЕХ ПОХОЖИХ ЗАМЕТОК
// ============================================

function showAllSimilarNotes(noteId, event) {
    event.stopPropagation();
    
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.content) return;
    
    const similar = findSimilarNotes(note.content, note.id, 10); // показываем до 10
    
    if (similar.length === 0) return;
    
    // Закрываем старый попап
    closeSimilarPopup();
    
    // Создаём попап
    const popup = document.createElement('div');
    popup.className = 'similar-popup';
    popup.id = 'similarPopup';
    
    popup.innerHTML = similar.map(function(n) {
        let title = n.title || 'Без названия';
        return `
            <div class="similar-popup-item" onclick="openNoteFromLink(${n.id}, event)">
                <span class="similar-popup-title">${escapeHtml(title)}</span>
                <span class="similar-popup-preview">${escapeHtml(n.content.slice(0, 40))}${n.content.length > 40 ? '…' : ''}</span>
            </div>
        `;
    }).join('');
    
    // Позиционируем
    const rect = event.target.getBoundingClientRect();
    const popupWidth = 260;
    let left = rect.left;
    let top = rect.bottom + 4;
    
    if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
    }
    if (top + 250 > window.innerHeight - 10) {
        top = rect.top - 250 - 4;
    }
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    
    document.body.appendChild(popup);
    window._similarPopup = popup;
    
    // Закрытие по клику вне
    setTimeout(function() {
        document.addEventListener('click', closeSimilarPopupHandler, { once: true });
    }, 10);
}

function closeSimilarPopupHandler(e) {
    if (e && e.target.closest && e.target.closest('.similar-popup')) return;
    closeSimilarPopup();
}

function closeSimilarPopup() {
    const popup = document.getElementById('similarPopup');
    if (popup) {
        popup.remove();
    }
    document.removeEventListener('click', closeSimilarPopupHandler);
}

// ============================================
// ВИКИ-ССЫЛКИ [[Заголовок]] — ИСПРАВЛЕННАЯ
// ============================================

function renderWikiLinks(text, currentNoteId) {
    if (!text) return text;
    
    // Простое и надёжное регулярное выражение
    const linkRegex = /\[\[([^\]]+?)(?:\|([^\]]+?))?\]\]/g;
    
    return text.replace(linkRegex, function(match, title, altText) {
        const cleanTitle = title.trim();
        const displayText = (altText || cleanTitle).trim();
        
        const note = notes.find(function(n) {
            return n.title && n.title.toLowerCase() === cleanTitle.toLowerCase() && 
                   !n.trashed && 
                   n.id !== currentNoteId;
        });
        
        if (note) {
            return '<span class="text-link" onclick="openNoteFromLink(' + note.id + ', event)" ' +
                   'data-note-id="' + note.id + '" ' +
                   'title="Открыть заметку: ' + cleanTitle.replace(/"/g, '&quot;') + '">' +
                   displayText.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                   '<svg class="link-icon" width="14" height="14" viewBox="0 0 24 24" ' +
                   'fill="none" stroke="currentColor" stroke-width="2.5" ' +
                   'stroke-linecap="round" stroke-linejoin="round">' +
                   '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
                   '<polyline points="15 3 21 3 21 9"/>' +
                   '<line x1="10" y1="14" x2="21" y2="3"/>' +
                   '</svg>' +
                   '</span>';
        } else {
            return '<span style="color: var(--text-secondary); opacity: 0.5; cursor: default;" title="Заметка не найдена">' + 
                   displayText.replace(/</g, '&lt;').replace(/>/g, '&gt;') + 
                   '</span>';
        }
    });
}

window.renderWikiLinks = renderWikiLinks;

// createNoteElement уже вызывает renderSimilarNotesBlock напрямую (в markdown.js)
// renderMarkdown вызывает renderTextWithLinks напрямую (в markdown.js)

// Экспорт
window.findNoteLinks = findNoteLinks;
window.renderTextWithLinks = renderTextWithLinks;
window.openNoteFromLink = openNoteFromLink;
window.findSimilarNotes = findSimilarNotes;
window.renderSimilarNotesBlock = renderSimilarNotesBlock;
window.showAllSimilarNotes = showAllSimilarNotes;
window.closeSimilarPopup = closeSimilarPopup;
