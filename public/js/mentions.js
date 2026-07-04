// ============================================
// @-МЕНТИ В СТИЛЕ TELEGRAM/NOTION
// ============================================

let mentionSuggestions = [];
let mentionIndex = -1;
let mentionQuery = '';
let mentionStartPos = -1;
let mentionActive = false;

// ============================================
// 1. ОБРАБОТЧИК ВВОДА
// ============================================

function setupMentions() {
    const content = document.getElementById('noteContent');
    if (!content) return;
    
    content.addEventListener('input', function(e) {
        const cursorPos = this.selectionStart;
        const text = this.value;
        
        const lastAt = text.lastIndexOf('@', cursorPos - 1);
        
        if (lastAt !== -1) {
            const prevChar = text[lastAt - 1] || '';
            if (prevChar.match(/[a-zA-Zа-яА-ЯёЁ]/)) {
                hideMentions();
                return;
            }
            
            const nextChar = text[lastAt + 1] || '';
            if (nextChar === ' ') {
                hideMentions();
                return;
            }
            
            const query = text.substring(lastAt + 1, cursorPos);
            mentionQuery = query;
            mentionStartPos = lastAt;
            mentionActive = true;
            
            if (query.length >= 1) {
                showMentionSuggestions(query, content);
            } else {
                showMentionSuggestions('', content);
            }
        } else {
            // Если @ нет в тексте, но список виден — убираем
            if (mentionActive) {
                hideMentions();
            }
        }
    });
    
    content.addEventListener('keydown', function(e) {
        // Escape обрабатываем отдельно (глобально)
        
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (mentionSuggestions.length > 0) {
                e.preventDefault();
                navigateMentions(e.key === 'ArrowDown' ? 1 : -1);
            }
        }
        
        if (e.key === 'Tab' || e.key === 'Enter') {
            if (mentionSuggestions.length > 0 && mentionIndex >= 0) {
                e.preventDefault();
                insertMention(mentionIndex);
            }
        }
    });
}

// ============================================
// 2. ПОИСК И РАНЖИРОВАНИЕ
// ============================================

function searchAndRankMentions(query, currentNoteId) {
    const allNotes = notes.filter(n => 
        n.id !== currentNoteId && 
        !n.trashed && 
        !n.archived
    );
    
    if (allNotes.length === 0) return [];
    
    const currentNote = notes.find(n => n.id === currentNoteId);
    const cleanQuery = query.toLowerCase().trim();
    
    if (!cleanQuery) {
        return allNotes
            .map(note => {
                const linkCount = notes.filter(other => 
                    other.content && other.content.includes(`[[${note.title}]]`)
                ).length;
                return { ...note, score: linkCount * 10 };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }
    
    const ranked = allNotes.map(note => {
        let score = 0;
        
        if (note.title.toLowerCase() === cleanQuery) score += 100;
        if (note.title.toLowerCase().startsWith(cleanQuery)) score += 50;
        if (note.title.toLowerCase().includes(cleanQuery)) score += 20;
        if (note.content.toLowerCase().includes(cleanQuery)) score += 10;
        
        if (note.aliases && note.aliases.some(a => a.toLowerCase().includes(cleanQuery))) {
            score += 30;
        }
        
        const linkCount = notes.filter(other => 
            other.content && other.content.includes(`[[${note.title}]]`)
        ).length;
        score += linkCount * 5;
        
        const daysSinceEdit = (Date.now() - new Date(note.date).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSinceEdit);
        
        if (currentNote && currentNote.tags && note.tags) {
            const common = currentNote.tags.filter(t => note.tags.includes(t));
            score += common.length * 15;
        }
        
        return { ...note, score };
    });
    
    return ranked
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}

// ============================================
// 3. ОТОБРАЖЕНИЕ ПОДСКАЗОК
// ============================================

function showMentionSuggestions(query, textarea) {
    const currentNoteId = window.currentNoteId || null;
    
    const suggestions = searchAndRankMentions(query, currentNoteId);
    
    if (suggestions.length === 0) {
        hideMentions();
        return;
    }
    
    mentionSuggestions = suggestions;
    mentionIndex = 0;
    mentionActive = true;
    
    let container = document.getElementById('mentionSuggestions');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mentionSuggestions';
        container.style.cssText = `
            position: fixed;
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            z-index: 10000;
            max-height: 300px;
            overflow-y: auto;
            min-width: 250px;
            max-width: 400px;
            padding: 6px 0;
        `;
        document.body.appendChild(container);
    }
    
    const rect = textarea.getBoundingClientRect();
    const cursorPos = textarea.selectionStart;
    const lineHeight = 24;
    const lines = textarea.value.substring(0, cursorPos).split('\n');
    const lineIndex = lines.length - 1;
    const lineText = lines[lineIndex] || '';
    
    const measure = document.createElement('span');
    measure.style.cssText = `
        position: fixed;
        visibility: hidden;
        font: ${getComputedStyle(textarea).font};
        white-space: pre;
    `;
    measure.textContent = lineText;
    document.body.appendChild(measure);
    const textWidth = measure.offsetWidth;
    document.body.removeChild(measure);
    
    let left = rect.left + Math.min(textWidth, rect.width - 20);
    let top = rect.top + (lineIndex + 1) * lineHeight + 4;
    
    if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
    if (top + 300 > window.innerHeight) top = window.innerHeight - 310;
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    
    container.style.left = left + 'px';
    container.style.top = top + 'px';
    container.style.display = 'block';
    
    container.innerHTML = suggestions.map((note, index) => {
        const isActive = index === 0;
        let badge = '';
        if (index === 0 && query.length < 1) {
            badge = '⭐ часто используется';
        } else if (note.score > 50) {
            badge = '🔥 популярная';
        } else if (note.aliases && note.aliases.length > 0) {
            badge = '🏷️ ' + note.aliases.slice(0, 2).join(', ');
        }
        
        return `
            <div class="mention-item ${isActive ? 'active' : ''}" 
                 data-index="${index}"
                 style="
                    padding: 8px 16px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    background: ${isActive ? 'var(--hover-bg)' : 'transparent'};
                    transition: background 0.15s;
                 "
                 onclick="insertMention(${index})"
                 onmouseenter="this.style.background='var(--hover-bg)'"
                 onmouseleave="this.style.background='${isActive ? 'var(--hover-bg)' : 'transparent'}'">
                <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">
                    ${highlightMatch(note.title, query)}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between;">
                    <span>${note.content ? note.content.slice(0, 40) + (note.content.length > 40 ? '…' : '') : 'Нет содержания'}</span>
                    ${badge ? `<span style="font-size: 11px; opacity: 0.6;">${badge}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    const activeEl = container.querySelector('.mention-item.active');
    if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
    }
}

function highlightMatch(text, query) {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    return text.slice(0, index) + 
           `<strong style="color: var(--primary-color);">${text.slice(index, index + query.length)}</strong>` + 
           text.slice(index + query.length);
}

// ============================================
// 4. СКРЫТИЕ ПОДСКАЗОК
// ============================================

function hideMentions() {
    const container = document.getElementById('mentionSuggestions');
    if (container) {
        container.style.display = 'none';
    }
    mentionSuggestions = [];
    mentionIndex = -1;
    mentionQuery = '';
    mentionStartPos = -1;
    mentionActive = false;
}

function navigateMentions(direction) {
    if (mentionSuggestions.length === 0) return;
    
    mentionIndex = (mentionIndex + direction + mentionSuggestions.length) % mentionSuggestions.length;
    
    const container = document.getElementById('mentionSuggestions');
    if (container) {
        container.querySelectorAll('.mention-item').forEach((el, i) => {
            el.style.background = i === mentionIndex ? 'var(--hover-bg)' : 'transparent';
            el.classList.toggle('active', i === mentionIndex);
        });
        
        const activeEl = container.querySelector('.mention-item.active');
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    }
}

function insertMention(index) {
    if (!mentionSuggestions[index]) return;
    
    const content = document.getElementById('noteContent');
    if (!content) return;
    
    const note = mentionSuggestions[index];
    const text = content.value;
    const cursorPos = content.selectionStart;
    
    const atPos = text.lastIndexOf('@', cursorPos - 1);
    if (atPos === -1) return;
    
    const before = text.substring(0, atPos);
    const after = text.substring(cursorPos);
    let newText = before + `[[${note.title}]]` + after;
    
    // Убираем лишние пробелы
    newText = newText.replace(/\s{2,}/g, ' ');
    
    content.value = newText;
    content.focus();
    const newPos = atPos + note.title.length + 4;
    content.selectionStart = content.selectionEnd = newPos;
    content.dispatchEvent(new Event('input'));
    
    hideMentions();
    showToast(`🔗 Связано с "${note.title}"`);
}

function renderMentions(text, currentNoteId) {
    if (!text) return text;
    
    const mentionRegex = /(?<!\[\[)@([a-zA-Zа-яА-ЯёЁ0-9_\-\s]+?)(?=\s|$|\.|,|!|\?|;|:)/g;
    
    return text.replace(mentionRegex, function(match, name) {
        const cleanName = name.trim();
        if (cleanName.length < 2) return match;
        
        const note = notes.find(function(n) {
            return n.title.toLowerCase() === cleanName.toLowerCase() && 
                   !n.trashed && 
                   n.id !== currentNoteId;
        });
        
        if (note) {
            return `<span class="text-link" onclick="openNoteFromLink(${note.id}, event)" data-note-id="${note.id}" title="Открыть заметку: ${cleanName}">@${cleanName}<svg class="link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span>`;
        }
        
        return match;
    });
}

// ============================================
// 5. ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ЗАКРЫТИЯ
// ============================================

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const container = document.getElementById('mentionSuggestions');
        if (container && container.style.display !== 'none') {
            hideMentions();
            // Убираем @ из текста, если он остался
            const content = document.getElementById('noteContent');
            if (content && mentionActive) {
                const text = content.value;
                const atIndex = text.lastIndexOf('@', content.selectionStart);
                if (atIndex !== -1) {
                    // Проверяем, не является ли @ частью [[...]]
                    const beforeAt = text.substring(0, atIndex);
                    const afterAt = text.substring(atIndex + 1);
                    content.value = beforeAt + afterAt;
                    content.selectionStart = content.selectionEnd = atIndex;
                    content.dispatchEvent(new Event('input'));
                }
            }
        }
    }
});

// Закрытие по клику вне
document.addEventListener('click', function(e) {
    const container = document.getElementById('mentionSuggestions');
    if (!container || container.style.display === 'none') return;
    
    const isClickInside = container.contains(e.target);
    const isClickOnTextarea = e.target.closest('#noteContent') || e.target.id === 'noteContent';
    
    if (!isClickInside && !isClickOnTextarea) {
        hideMentions();
    }
});

// Закрытие при скролле
document.addEventListener('scroll', function() {
    hideMentions();
}, { passive: true });

// Закрытие при изменении размера окна
window.addEventListener('resize', function() {
    hideMentions();
});

// ============================================
// 6. ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupMentions, 500);
});

window.setupMentions = setupMentions;
window.insertMention = insertMention;
window.searchAndRankMentions = searchAndRankMentions;
window.hideMentions = hideMentions;
