// ============================================
// УМНЫЕ ССЫЛКИ В ТЕКСТЕ ЗАМЕТОК (исправленная версия)
// ============================================

function findNoteLinks(text, currentNoteId) {
    if (!text || text.length < 2) return [];
    
    // Разбиваем текст на слова (учитываем дефисы, точки, запятые)
    const words = text.split(/[\s\n\r\t,.;:!?()"']+/);
    const found = [];
    const processed = new Set();
    
    const allNotes = notes.filter(function(n) {
        return n.id !== currentNoteId && !n.trashed && !n.archived;
    });
    
    words.forEach(function(word) {
        const clean = word.replace(/^[-]+/, '').replace(/[-]+$/, '').toLowerCase();
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
        
        // Частичное совпадение
        allNotes.forEach(function(note) {
            if (processed.has(clean)) return;
            const titleWords = note.title.toLowerCase().split(/\s+/);
            if (titleWords.some(function(tw) {
                return tw.includes(clean) || clean.includes(tw);
            })) {
                processed.add(clean);
                found.push({
                    word: word,
                    clean: clean,
                    noteId: note.id,
                    title: note.title,
                    type: 'partial'
                });
            }
        });
    });
    
    return found.slice(0, 5);
}

function renderTextWithLinks(text, currentNoteId) {
    if (!text) return text;
    
    // Получаем чистый текст для поиска
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
        // Экранируем для regex
        const escaped = link.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Создаём regex с учётом регистра и границ слова
        const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
        
        // Заменяем все вхождения
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
    
    const words = text
        .toLowerCase()
        .split(/[\s\n\r\t,.;:!?()"']+/)
        .filter(function(w) { return w.length > 3; })
        .slice(0, 20);
    
    if (words.length === 0) return [];
    
    const allNotes = notes.filter(function(n) {
        return n.id !== currentNoteId && !n.trashed && !n.archived;
    });
    
    const scored = allNotes.map(function(note) {
        const noteText = (note.title + ' ' + note.content).toLowerCase();
        let score = 0;
        
        words.forEach(function(word) {
            if (noteText.includes(word)) {
                score++;
            }
        });
        
        const noteObj = notes.find(function(n) { return n.id === currentNoteId; });
        if (noteObj) {
            // ✅ ПРОВЕРКА НА СУЩЕСТВОВАНИЕ ТЕГОВ
            if (noteObj.tags && Array.isArray(noteObj.tags) && 
                note.tags && Array.isArray(note.tags)) {
                const commonTags = noteObj.tags.filter(function(t) {
                    return note.tags.includes(t);
                });
                score += commonTags.length * 2;
            }
        }
        
        return { ...note, score: score };
    });
    
    return scored
        .filter(function(n) { return n.score > 0; })
        .sort(function(a, b) { return b.score - a.score; })
        .slice(0, limit);
}

function renderSimilarNotesBlock(note) {
    // Проверка: есть ли контент для поиска похожих
    if (!note || !note.content || note.content.length < 10) return '';
    
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
        // ✅ ДОБАВЛЯЕМ КЛИК ДЛЯ ПОКАЗА ВСЕХ ПОХОЖИХ
        html += '<span class="note-similar-more" onclick="showAllSimilarNotes(' + note.id + ', event)">+' + (similar.length - maxDisplay) + '</span>';
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
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
console.log('Умные ссылки загружены');
