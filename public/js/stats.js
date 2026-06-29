// ============================================
// СТАТИСТИКА ЗАМЕТОК (без эмодзи)
// ============================================

function getNoteStats() {
    const active = notes.filter(n => !n.trashed && !n.archived);
    const trashed = notes.filter(n => n.trashed);
    const archived = notes.filter(n => n.archived && !n.trashed);
    
    const total = active.length;
    const totalWords = active.reduce((sum, n) => 
        sum + (n.content || '').split(/\s+/).filter(w => w.length > 0).length, 0
    );
    const totalChars = active.reduce((sum, n) => 
        sum + (n.content || '').length, 0
    );
    const avgLength = total > 0 ? Math.round(totalWords / total) : 0;
    const avgChars = total > 0 ? Math.round(totalChars / total) : 0;
    
    const tagStats = {};
    active.forEach(n => {
        n.tags.forEach(t => {
            tagStats[t] = (tagStats[t] || 0) + 1;
        });
    });
    const topTags = Object.entries(tagStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const dayStats = Array(7).fill(0);
    const now = new Date();
    
    active.forEach(n => {
        if (n.date) {
            let dateParts = n.date.match(/(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{4})/);
            if (!dateParts) {
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
                const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                dayStats[index]++;
            }
        }
    });
    
    const maxDay = Math.max(...dayStats);
    const maxDayIndex = dayStats.indexOf(maxDay);
    const busiestDay = maxDay > 0 ? weekDays[maxDayIndex] : '—';
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
// SVG-ИКОНКИ
// ============================================

const Icons = {
    // Иконка "Теги"
    tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83L12 2z"/>
        <path d="M7 7h.01"/>
    </svg>`,
    
    // Иконка "График"
    chart: `<svg width="16" height="16" viewBox="0 0 384 384">
    <path d="M80,80 L80,304" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
    <path d="M80,304 L304,304" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
    <path d="M272,240 L272,112" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
    <path d="M144,208 L144,240" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
    <path d="M208,176 L208,240" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
    </svg>`,
    
    // Иконка "Огонь" (активный день)
    fire: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2s-3 5-3 8a3 3 0 0 0 6 0c0-3-3-8-3-8z"/>
        <path d="M8.5 11.5c-1.5 1.5-2.5 3.5-2.5 5.5a6 6 0 0 0 12 0c0-2-1-4-2.5-5.5"/>
    </svg>`,
    
    // Иконка "Архив"
    archive: `<svg width="16" height="16" viewBox="0 0 416 352">
                            <path d="M208,80 L208,208" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M144,144 L208,208" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M208,208 L272,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M80,272 L336,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M336,272 L336,112" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M80,112 L80,272" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            </svg>`,
    
    // Иконка "Корзина"
    trash: `<svg width="16" height="16" viewBox="0 0 512 512">
                            <path d="M80,144 L432,144" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M176,80 L336,80" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M112,144 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M400,144 L368,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            <path d="M368,432 L144,432" stroke="currentColor" stroke-width="32" fill="none" stroke-linecap="round"/>
                            </svg>`,
    
    // Иконка "Заметка" (для заголовка)
    note: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
    </svg>`,
};

// ============================================
// РЕНДЕР СТАТИСТИКИ (без эмодзи)
// ============================================

function renderStats() {
    const stats = getNoteStats();
    const container = document.getElementById('statsContainer');
    if (!container) return;
    
    if (stats.total === 0) {
        container.innerHTML = `
            <div class="stats-empty">
                ${Icons.note}
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
                <div class="stats-section-title">
                    ${Icons.tag}
                    Популярные теги
                </div>
                <div class="stats-tags-list">
                    ${tagsHtml}
                </div>
            </div>
        ` : ''}
        
        <div class="stats-section">
            <div class="stats-section-title">
                ${Icons.chart}
                Активность по дням
            </div>
            <div class="stats-bars">
                ${barsHtml}
            </div>
            ${stats.busiestDay !== '—' ? `
                <div class="stats-busiest">
             
                    Самый активный день: <strong>${stats.busiestDay}</strong>
                </div>
            ` : ''}
        </div>
        
        <div class="stats-footer">
            <span>${Icons.archive} Архив: ${stats.archived}</span>
            <span>${Icons.trash} Корзина: ${stats.trashed}</span>
        </div>
    `;
}

// ============================================
// ОБНОВЛЕНИЕ СТАТИСТИКИ
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

// Экспортируем
window.renderStats = renderStats;
window.scheduleStatsUpdate = scheduleStatsUpdate;

console.log('📊 Статистика загружена (без эмодзи)');
