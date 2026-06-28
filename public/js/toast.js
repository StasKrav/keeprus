// ============================================
// TOAST
// ============================================

let toastTimeout;

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'flex';
    toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('visible');
        toast.style.display = 'none';
    }, 2500);
}

function showReminderToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="closeToast()">✕</button>
    `;
    toast.style.display = 'flex';
    toast.classList.add('visible');
    toast.classList.add('toast-with-button');
}

function closeToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('visible');
    toast.classList.remove('toast-with-button');
    toast.innerHTML = '';
    toast.style.display = 'none';
    clearTimeout(toastTimeout);
}

// ============================================
// ФУНКЦИИ ДЛЯ МЕНЮ
// ============================================

function exportNotes() {
    try {
        const data = JSON.stringify(notes, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keeprus_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {}
}

function importNotes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async function() {
        const file = this.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!Array.isArray(data)) {
                showToast('Неверный формат файла');
                return;
            }
            if (!confirm(`Импортировать ${data.length} заметок? Текущие заметки будут заменены.`)) {
                return;
            }
            notes = data;
            saveNotes();
            renderNotes();
        } catch (err) {}
    };
    input.click();
}

function exportAllAsMarkdown() {
    try {
        let md = '# Keeprus Export\n\n';
        md += `Экспортировано: ${new Date().toLocaleString()}\n\n`;
        md += '---\n\n';
        
        notes.forEach((note) => {
            if (!note.trashed) {
                md += `## ${note.title || 'Без названия'}\n\n`;
                md += `${note.content || ''}\n\n`;
                if (note.tags && note.tags.length) {
                    md += `**Теги:** ${note.tags.join(', ')}\n\n`;
                }
                md += `*${note.date || ''}*\n\n`;
                md += '---\n\n';
            }
        });
        
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keeprus_export_${new Date().toISOString().slice(0,10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {}
}
