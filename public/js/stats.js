// ============================================
// СТАТИСТИКА ЗАМЕТОК
// ============================================

function getNoteStats() {
    const active = notes.filter(n => !n.trashed && !n.archived);
    const trashed = notes.filter(n => n.trashed);
    const archived = notes.filter(n => n.archived && !n.trashed);
    
    // Общая статистика
    const total = active.length;
    const totalWords = active.reduce((sum, n) => 
        sum + (n.content || '').split(/\s+/).filter(w => w.length > 0).length, 0
    );
    const totalChars = active.reduce((sum, n) => 
        sum + (n.content || '').length, 0
    );
    const avgLength = total > 0 ? Math.round(totalWords / total) : 0;
    const avgChars = total > 0 ? Math.round(totalChars / total) : 0;
    
    // Топ-теги
    const tagStats = {};
    active.forEach(n => {
        n.tags.forEach(t => {
            tagStats[t] = (tagStats[t] || 0) + 1;
        });
    });
    const topTags = Object.entries(tagStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Активность по дням недели
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const dayStats = Array(7).fill(0);
    const now = new Date();
    
    active.forEach(n => {
        if (n.date) {
            // Парсим дату (формат: "29.06.2026 14:30" или "29 июня 2026")
            let dateParts = n.date.match(/(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{4})/);
            if (!dateParts) {
                // Пробуем другой формат
                dateParts = n.date.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (dateParts) {
                    dateParts = [dateParts[0], dateParts[3], dateParts[2], dateParts[1]];
                }
            }
            
            if (dateParts) {
                const day = parseInt(dateParts[1]);
                const month = parseInt(dateParts[2]) - 1;
                const year = parseInt(dateParts[3]);
                const noteDate = new Date(year, month, day);
                const dayOfWeek = noteDate.getDay();
                // Преобразуем: 0 = воскресенье, 1 = понедельник, ...
                const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                dayStats[index]++;
            }
        }
    });
    
    // Максимальная активность
    const maxDay = Math.max(...dayStats);
    const maxDayIndex = dayStats.indexOf(maxDay);
    const busiestDay = maxDay > 0 ? weekDays[maxDayIndex] : '—';
    
    // Закреплённые
    const pinned = active.filter(n => n.pinned).length;
    
    return {
        total,
        totalWords,
        totalChars,
        avgLength,
        avgChars,
        topTags,
        dayStats,
        weekDays,
        busiestDay,
        pinned,
        trashed: trashed.length,
        archived: archived.length,
    };
}

// ============================================
// РЕНДЕР СТАТИСТИКИ
// ============================================

function renderStats() {
    const stats = getNoteStats();
    const container = document.getElementById('statsContainer');
    if (!container) return;
    
    if (stats.total === 0) {
        container.innerHTML = `
            <div class="stats-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5">
                    <path d="M12 2v4"/>
                    <path d="M12 18v4"/>
                    <path d="M4.93 4.93l2.83 2.83"/>
                    <path d="M16.24 16.24l2.83 2.83"/>
                    <path d="M2 12h4"/>
                    <path d="M18 12h4"/>
                    <path d="M4.93 19.07l2.83-2.83"/>
                    <path d="M16.24 7.76l2.83-2.83"/>
                </svg>
                <p>Нет заметок для статистики</p>
            </div>
        `;
        return;
    }
    
    // Строим гистограмму активности
    const maxDayValue = Math.max(...stats.dayStats, 1);
    const barsHtml = stats.dayStats.map((count, i) => {
        const height = count > 0 ? Math.round((count / maxDayValue) * 60) : 0;
        const isMax = count === maxDayValue && count > 0;
        return `
            <div class="stats-day" title="${stats.weekDays[i]}: ${count} заметок">
                <div class="stats-bar ${isMax ? 'stats-bar-max' : ''}" style="height: ${height}px;"></div>
                <span class="stats-day-label">${stats.weekDays[i]}</span>
                <span class="stats-day-count">${count}</span>
            </div>
        `;
    }).join('');
    
    // Строим топ-теги
    const tagsHtml = stats.topTags.map(([tag, count], i) => {
        const maxCount = stats.topTags.length > 0 ? stats.topTags[0][1] : 1;
        const width = Math.round((count / maxCount) * 100);
        const colors = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0'];
        return `
            <div class="stats-tag-row" key="${i}">
                <span class="stats-tag-name">#${tag}</span>
                <div class="stats-tag-bar-track">
                    <div class="stats-tag-bar" style="width: ${width}%; background: ${colors[i % colors.length]};"></div>
                </div>
                <span class="stats-tag-count">${count}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stats-card">
                <div class="stats-number">${stats.total}</div>
                <div class="stats-label">Всего заметок</div>
            </div>
            <div class="stats-card">
                <div class="stats-number">${stats.totalWords}</div>
                <div class="stats-label">Всего слов</div>
            </div>
            <div class="stats-card">
                <div class="stats-number">${stats.avgLength}</div>
                <div class="stats-label">Средняя длина</div>
            </div>
            <div class="stats-card">
                <div class="stats-number">${stats.pinned}</div>
                <div class="stats-label">Закреплено</div>
            </div>
        </div>
        
        ${stats.topTags.length > 0 ? `
            <div class="stats-section">
                <div class="stats-section-title">🏷️ Популярные теги</div>
                <div class="stats-tags-list">
                    ${tagsHtml}
                </div>
            </div>
        ` : ''}
        
        <div class="stats-section">
            <div class="stats-section-title">📈 Активность по дням</div>
            <div class="stats-bars">
                ${barsHtml}
            </div>
            ${stats.busiestDay !== '—' ? `
                <div class="stats-busiest">
                    🔥 Самый активный день: <strong>${stats.busiestDay}</strong>
                </div>
            ` : ''}
        </div>
        
        <div class="stats-footer">
            <span>📦 Архив: ${stats.archived}</span>
            <span>🗑️ Корзина: ${stats.trashed}</span>
        </div>
    `;
}

// ============================================
// ОБНОВЛЕНИЕ СТАТИСТИКИ ПРИ ИЗМЕНЕНИЯХ
// ============================================

let statsUpdateTimeout = null;

function scheduleStatsUpdate() {
    clearTimeout(statsUpdateTimeout);
    statsUpdateTimeout = setTimeout(() => {
        renderStats();
    }, 300);
}

// Патчим saveNotes для обновления статистики
const originalSaveNotes = window.saveNotes;
if (originalSaveNotes) {
    window.saveNotes = function() {
        originalSaveNotes.apply(this, arguments);
        scheduleStatsUpdate();
    };
}
