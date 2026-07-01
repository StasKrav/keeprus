// js/selection.js

class Selection {
    constructor() {
        this.selectedIds = new Set();
        this.lastSelectedId = null;
        this.isContextMenuOpen = false;
        this.init();
    }

    init() {
        // Клик по заметке
        document.getElementById('notesContainer').addEventListener('click', (e) => {
            const card = e.target.closest('.note-card');
            if (!card) return;
            
            const id = parseInt(card.dataset.id);
            if (isNaN(id)) return;
            
            // Игнорируем клики по кнопкам
            if (e.target.closest('.action-button') || 
                e.target.closest('.note-tag') ||
                e.target.closest('.pin-icon')) {
                return;
            }
            
            // Ctrl/Cmd — переключение
            if (e.ctrlKey || e.metaKey) {
                this.toggle(id);
                return;
            }
            
            // Shift — диапазон
            if (e.shiftKey && this.lastSelectedId !== null) {
                this.selectRange(this.lastSelectedId, id);
                return;
            }
            
            // Обычный клик
            this.toggle(id);
        });

        // ПКМ по заметке
        document.getElementById('notesContainer').addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.note-card');
            if (!card) return;
            
            const id = parseInt(card.dataset.id);
            if (isNaN(id)) return;
            
            // Если заметка не выделена — выделяем её
            if (!this.isSelected(id)) {
                this.clear();
                this.select(id);
            }
            
            // Показываем контекстное меню
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        // Клик вне заметок — снять выделение
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.note-card') && 
                !e.target.closest('.context-menu')) {
                this.clear();
            }
        });

        // Escape — снять выделение
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clear();
                this.hideContextMenu();
            }
        });
    }

    // === Управление выделением ===

    toggle(id) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
            this.lastSelectedId = id;
        }
        this.updateUI();
    }

    select(id) {
        this.selectedIds.add(id);
        this.lastSelectedId = id;
        this.updateUI();
    }

    deselect(id) {
        this.selectedIds.delete(id);
        this.updateUI();
    }

    clear() {
        this.selectedIds.clear();
        this.lastSelectedId = null;
        this.updateUI();
        this.hideContextMenu();
    }

    selectRange(fromId, toId) {
        const allIds = this.getVisibleNoteIds();
        const fromIndex = allIds.indexOf(fromId);
        const toIndex = allIds.indexOf(toId);
        
        if (fromIndex === -1 || toIndex === -1) return;
        
        const min = Math.min(fromIndex, toIndex);
        const max = Math.max(fromIndex, toIndex);
        
        for (let i = min; i <= max; i++) {
            this.selectedIds.add(allIds[i]);
        }
        this.updateUI();
    }

    selectAll() {
        const allIds = this.getVisibleNoteIds();
        allIds.forEach(id => this.selectedIds.add(id));
        this.updateUI();
    }

    isSelected(id) {
        return this.selectedIds.has(id);
    }

    getSelectedNotes() {
        return notes.filter(n => this.selectedIds.has(n.id));
    }

    getVisibleNoteIds() {
        return getFilteredNotes().map(n => n.id);
    }

    get count() {
        return this.selectedIds.size;
    }

    // === Обновление UI ===

    updateUI() {
        document.querySelectorAll('.note-card').forEach(card => {
            const id = parseInt(card.dataset.id);
            card.classList.toggle('selected', this.isSelected(id));
        });

        // Обновляем статус в меню (если открыто)
        this.updateContextMenuInfo();
    }

    // === Контекстное меню ===

    showContextMenu(x, y) {
        this.hideContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'contextMenu';
        
        const count = this.count;
        const selected = this.getSelectedNotes();
        
        // Проверяем состояние выделенных
        const allPinned = selected.every(n => n.pinned);
        const allArchived = selected.every(n => n.archived);
        const allTrashed = selected.every(n => n.trashed);
        
        // Формируем меню
        let items = [];
        
        // Информация
        items.push({
            type: 'info',
            label: `Выбрано: ${count}`,
            disabled: true
        });
        
        items.push({ type: 'divider' });
        
        // Действия (только если не в корзине)
        if (!allTrashed) {
            items.push({
                type: 'action',
                label: allPinned ? 'Открепить' : 'Закрепить',
                action: () => this.batchPin()
            });
            
            items.push({
                type: 'action',
                label: allArchived ? 'Разархивировать' : 'В архив',
                 action: () => this.batchArchive()
            });
            
            items.push({
                type: 'action',
                label: 'Добавить тег',
                action: () => this.batchTag()
            });
            
            items.push({
                type: 'action',
                label: 'Сменить цвет',
                action: () => this.batchColor()
            });
            
            items.push({ type: 'divider' });
            
            items.push({
                type: 'action',
                label: 'Удалить',
                danger: true,
                action: () => this.batchDelete()
            });
        } else {
            // В корзине
            items.push({
                type: 'action',
                label: 'Восстановить',
                action: () => this.batchRestore()
            });
            
            items.push({ type: 'divider' });
            
            items.push({
                type: 'action',
                label: 'Удалить навсегда',
                danger: true,
                action: () => this.batchDeletePermanent()
            });
        }
        
        items.push({ type: 'divider' });
        
        items.push({
            type: 'action',
            label: 'Снять выделение',
            action: () => this.clear()
        });
        
        // Строим HTML
        menu.innerHTML = items.map(item => {
            if (item.type === 'divider') {
                return '<div class="context-divider"></div>';
            }
            if (item.type === 'info') {
                return `<div class="context-info">${item.label}</div>`;
            }
            return `
                <button class="context-item ${item.danger ? 'danger' : ''}" 
                        data-action="${item.action?.name || 'none'}">
                    ${item.icon ? `<span class="context-icon">${item.icon}</span>` : ''}
                    <span class="context-label">${item.label}</span>
                </button>
            `;
        }).join('');
        
        // Добавляем обработчики
        menu.querySelectorAll('.context-item').forEach((btn, index) => {
            const item = items.filter(i => i.type === 'action')[index];
            if (item && item.action) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.action();
                    this.hideContextMenu();
                });
            }
        });
        
        // Позиционируем
        menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
        
        document.body.appendChild(menu);
        this.isContextMenuOpen = true;
        
        // Закрытие по клику вне меню
        setTimeout(() => {
            document.addEventListener('click', this.closeMenuHandler = () => {
                this.hideContextMenu();
            }, { once: true });
        }, 10);
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) menu.remove();
        this.isContextMenuOpen = false;
        
        if (this.closeMenuHandler) {
            document.removeEventListener('click', this.closeMenuHandler);
            this.closeMenuHandler = null;
        }
    }

    updateContextMenuInfo() {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        
        const info = menu.querySelector('.context-info');
        if (info) {
            info.textContent = `Выбрано: ${this.count}`;
        }
    }

    // === Массовые действия ===

    batchPin() {
        const selected = this.getSelectedNotes();
        if (selected.length === 0) return;
        
        // Все ли закреплены?
        const allPinned = selected.every(n => n.pinned);
        
        selected.forEach(note => {
            note.pinned = !allPinned;
        });
        
        this.saveAndRefresh('закреплены');
    }

    batchArchive() {
        const selected = this.getSelectedNotes();
        if (selected.length === 0) return;
        
        const allArchived = selected.every(n => n.archived);
        
        selected.forEach(note => {
            note.archived = !allArchived;
        });
        
        this.saveAndRefresh(allArchived ? 'разархивированы' : 'заархивированы');
    }

    
    batchDelete() {
        const selected = this.getSelectedNotes();
        if (selected.length === 0) return;
        
        // ✅ Исправлено: showGenericConfirmDialog вместо showConfirmDialog
        showGenericConfirmDialog(
            `Удалить ${selected.length} заметок?`,
            'Заметки будут перемещены в корзину',
            'Подтвердить',
            () => {
                selected.forEach(note => {
                    note.trashed = true;
                    note.trashDate = new Date().toISOString();
                });
                this.saveAndRefresh('удалены');
            }
        );
    }
    
    batchDeletePermanent() {
        const selected = this.getSelectedNotes();
        if (selected.length === 0) return;
        
        // ✅ Исправлено
        showGenericConfirmDialog(
            `Удалить ${selected.length} заметок навсегда?`,
            'Это действие невозможно отменить',
            'Удалить навсегда',
            () => {
                const ids = new Set(selected.map(n => n.id));
                notes = notes.filter(n => !ids.has(n.id));
                this.saveAndRefresh('удалены навсегда');
            }
        );
    }
    
    batchTag() {
        const selected = this.getSelectedNotes();
        if (selected.length === 0) return;
        
        // ✅ Исправлено: showPromptDialog с правильными параметрами
        showPromptDialog((tag) => {
            if (!tag || tag.trim() === '') return;
            const trimmedTag = tag.trim();
            
            selected.forEach(note => {
                if (!note.tags.includes(trimmedTag)) {
                    note.tags.push(trimmedTag);
                }
            });
            this.saveAndRefresh(`тег "${trimmedTag}" добавлен`);
        });
    }

    batchRestore() {
        const selected = this.getSelectedNotes();
        if (selected.length === 0) return;
        
        selected.forEach(note => {
            note.trashed = false;
            note.trashDate = null;
        });
        
        this.saveAndRefresh('восстановлены');
    }


    batchColor() {
        const selected = this.getSelectedNotes();
        if (selected.length === 0) return;
        
        this.showColorPickerDialog((color) => {
            selected.forEach(note => {
                note.color = color;
            });
            this.saveAndRefresh('цвет изменён');
        });
    }

    // === Вспомогательные методы ===

    saveAndRefresh(message) {
        saveNotes();
        this.clear();
        renderNotes();
        updateCounts();
        
        if (message) {
            showToast(`✅ ${this.count} заметок ${message}`);
        }
    }

    showConfirmDialog(title, message, callback) {
        // Используем существующий диалог
        showGenericConfirmDialog(title, message, 'Подтвердить', callback);
    }

    showPromptDialog(message, callback) {
        // Используем существующий диалог
        showPromptDialog(callback, message);
    }

    showColorPickerDialog(callback) {
        // Показываем палитру цветов
        // Можно использовать существующий color picker
        const colors = [
            'color-default', 'color-red', 'color-orange', 'color-yellow',
            'color-green', 'color-teal', 'color-blue', 'color-purple'
        ];
        
        // Создаём временный диалог выбора цвета
        const overlay = document.createElement('div');
        overlay.className = 'color-picker-dialog-overlay';
        overlay.innerHTML = `
            <div class="color-picker-dialog">
                <div class="color-picker-header">
                    <span>Выберите цвет</span>
                    <button onclick="this.closest('.color-picker-dialog-overlay').remove()">✕</button>
                </div>
                <div class="color-picker-grid">
                    ${colors.map(color => `
                        <div class="color-option ${color}" data-color="${color}"></div>
                    `).join('')}
                </div>
            </div>
        `;
        
        overlay.querySelectorAll('.color-option').forEach(el => {
            el.addEventListener('click', () => {
                const color = el.dataset.color;
                overlay.remove();
                callback(color);
            });
        });
        
        document.body.appendChild(overlay);
    }
}

// Создаём глобальный экземпляр
const selection = new Selection();
window.selection = selection;

// Ctrl+A — выделить всё
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const target = e.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            selection.selectAll();
        }
    }
});

console.log('✅ Selection mode loaded');


