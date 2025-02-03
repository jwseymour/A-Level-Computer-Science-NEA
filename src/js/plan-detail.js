// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
    window.location.href = '/auth.html';
}

// Get the plan ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const planId = urlParams.get('id');

// Get DOM elements
const planTitle = document.getElementById('planTitle');
const planContent = document.getElementById('planContent');

let blocks = [];
let currentPlan = null;
let editablePlan = null;  // For storing API-compatible format

let allBlocks = [];
let uniqueBlockTags = new Set();

// Load training blocks
async function loadBlocks() {
    try {
        const response = await fetch('/api/blocks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('Failed to load blocks');
        allBlocks = await response.json();
        
        // Extract unique tags
        uniqueBlockTags = new Set();
        allBlocks.forEach(block => {
            if (block.tags) {
                block.tags.split(',').forEach(tag => {
                    uniqueBlockTags.add(tag.trim());
                });
            }
        });
        
        // Populate tag filter
        const tagFilter = document.getElementById('blockTagFilter');
        tagFilter.innerHTML = '<option value="">All Tags</option>' + 
            Array.from(uniqueBlockTags).sort().map(tag => 
                `<option value="${tag}">${tag}</option>`
            ).join('');
        
        filterBlocks();
    } catch (error) {
        console.error('Error loading blocks:', error);
    }
}

function filterBlocks() {
    const favoritesOnly = document.getElementById('blocksFavoritesOnly').checked;
    const selectedTag = document.getElementById('blockTagFilter').value;
    
    const filteredBlocks = allBlocks.filter(block => {
        const matchesFavorite = !favoritesOnly || block.is_favorited;
        const matchesTag = !selectedTag || 
            (block.tags && block.tags.split(',').map(t => t.trim()).includes(selectedTag));
        
        return matchesFavorite && matchesTag;
    });
    
    blocks = filteredBlocks;
    renderBlocks();
}

function renderBlocks() {
    const blocksList = document.getElementById('blocksList');
    blocksList.innerHTML = blocks.map(block => `
        <div class="block-item" draggable="true" data-block-id="${block.id}">
            <div class="block-header">
                <div class="block-title-wrapper">
                    <div class="block-title">${block.title}</div>
                    <span class="block-favorite-indicator ${block.is_favorited ? 'active' : ''}">★</span>
                </div>
                <div class="block-actions">
                    <button class="icon-button dropdown-trigger" onclick="toggleDropdown(event)">
                        ⋮
                    </button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item favorite-btn ${block.is_favorited ? 'active' : ''}" 
                                onclick="toggleBlockFavorite(${block.id}, event)">
                            ${block.is_favorited ? '★ Unfavorite' : '☆ Favorite'}
                        </button>
                        <button class="dropdown-item" onclick="editBlock(${block.id}, event)">
                            ✎ Edit
                        </button>
                        <button class="dropdown-item delete-btn" onclick="deleteBlock(${block.id}, event)">
                            × Delete
                        </button>
                    </div>
                </div>
            </div>
            <div class="block-description">${block.description || ''}</div>
            ${block.tags ? `<div class="block-tags">${block.tags}</div>` : ''}
        </div>
    `).join('');

    // Add drag event listeners
    document.querySelectorAll('.block-item').forEach(block => {
        block.addEventListener('dragstart', handleDragStart);
        block.addEventListener('dragend', handleDragEnd);
    });
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = event.target.nextElementSibling;
    
    // Close all other dropdowns first
    document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
        if (menu !== dropdown) {
            menu.classList.remove('active');
        }
    });
    
    dropdown.classList.toggle('active');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown-menu') && !event.target.closest('.dropdown-trigger')) {
        document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }
});

// Add toggle favorite function
async function toggleBlockFavorite(blockId, event) {
    event.stopPropagation();
    try {
        const response = await fetch(`/api/blocks/${blockId}/favorite`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to toggle favorite');
        }

        // Refresh blocks list
        loadBlocks();
    } catch (error) {
        console.error('Error toggling block favorite:', error);
    }
}

// Edit block
async function editBlock(blockId, event) {
    event.stopPropagation();
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const title = prompt('Edit block title:', block.title);
    if (!title) return;

    const description = prompt('Edit block description:', block.description || '');
    const tags = prompt('Edit block tags (comma-separated):', block.tags || '');
    const is_favorited = 0;

    try {
        const response = await fetch(`/api/blocks/${blockId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title, description, tags, is_favorited })
        });

        if (!response.ok) throw new Error('Failed to update block');

        const updatedBlock = await response.json();
        blocks = blocks.map(b => b.id === blockId ? updatedBlock : b);
        
        // Update block details in currentPlan
        currentPlan.weeks.forEach(week => {
            Object.values(week.days).forEach(dayBlocks => {
                dayBlocks.forEach(block => {
                    if (block.id === blockId) {
                        block.title = updatedBlock.title;
                        block.description = updatedBlock.description;
                        block.tags = updatedBlock.tags;
                    }
                });
            });
        });

        renderBlocks();
        renderPlan();
    } catch (error) {
        console.error('Error updating block:', error);
    }
}

// Delete block
async function deleteBlock(blockId, event) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this block?')) return;

    try {
        const response = await fetch(`/api/blocks/${blockId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete block');

        blocks = blocks.filter(b => b.id !== blockId);

        // Remove the block from currentPlan and editablePlan
        currentPlan.weeks.forEach(week => {
            Object.keys(week.days).forEach(day => {
                week.days[day] = week.days[day].filter(block => block.id !== blockId);
            });
        });

        editablePlan.weeks.forEach(week => {
            Object.keys(week.days).forEach(day => {
                week.days[day] = week.days[day].filter(block => block.id !== blockId);
            });
        });

        renderBlocks();
        renderPlan();
    } catch (error) {
        console.error('Error deleting block:', error);
    }
}

function showBlockSelectionModal(dropZone) {
    const modal = document.createElement('div');
    modal.className = 'block-selection-modal';
    
    const weekElement = dropZone.closest('.week-container');
    const weekId = parseInt(weekElement.dataset.weekId);
    const dayNumber = parseInt(dropZone.dataset.day);
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Select Training Block</h3>
                <div class="filter-controls">
                    <select id="modalBlockTagFilter" class="tag-filter">
                        <option value="">All Tags</option>
                        ${Array.from(uniqueBlockTags).sort().map(tag => 
                            `<option value="${tag}">${tag}</option>`
                        ).join('')}
                    </select>
                    <label class="favorite-filter">
                        <input type="checkbox" id="modalBlocksFavoritesOnly">
                        <span class="favorite-label">★ Favorites Only</span>
                    </label>
                </div>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-blocks">
                ${blocks.map(block => `
                    <div class="modal-block-item" data-block-id="${block.id}">
                        <div class="block-header">
                            <div class="block-title-wrapper">
                                <div class="block-title">${block.title}</div>
                                <span class="block-favorite-indicator ${block.is_favorited ? 'active' : ''}">★</span>
                            </div>
                        </div>
                        <div class="block-description">${block.description || ''}</div>
                        ${block.tags ? `<div class="block-tags">${block.tags}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Add filter functionality
    function filterModalBlocks() {
        const favoritesOnly = document.getElementById('modalBlocksFavoritesOnly').checked;
        const selectedTag = document.getElementById('modalBlockTagFilter').value;
        
        const filteredBlocks = allBlocks.filter(block => {
            const matchesFavorite = !favoritesOnly || block.is_favorited;
            const matchesTag = !selectedTag || 
                (block.tags && block.tags.split(',').map(t => t.trim()).includes(selectedTag));
            
            return matchesFavorite && matchesTag;
        });
        
        const modalBlocks = modal.querySelector('.modal-blocks');
        modalBlocks.innerHTML = filteredBlocks.map(block => `
            <div class="modal-block-item" data-block-id="${block.id}">
                <div class="block-header">
                    <div class="block-title-wrapper">
                        <div class="block-title">${block.title}</div>
                        <span class="block-favorite-indicator ${block.is_favorited ? 'active' : ''}">★</span>
                    </div>
                </div>
                <div class="block-description">${block.description || ''}</div>
                ${block.tags ? `<div class="block-tags">${block.tags}</div>` : ''}
            </div>
        `).join('');

        // Reattach click handlers
        attachBlockClickHandlers();
    }

    function attachBlockClickHandlers() {
        modal.querySelectorAll('.modal-block-item').forEach(blockItem => {
            blockItem.addEventListener('click', () => {
                const blockId = parseInt(blockItem.dataset.blockId);
                handleNewBlockDrop(blockId, weekId, dayNumber);
                modal.remove();
            });
        });
    }
    
    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Add filter event listeners
    modal.querySelector('#modalBlockTagFilter').addEventListener('change', filterModalBlocks);
    modal.querySelector('#modalBlocksFavoritesOnly').addEventListener('change', filterModalBlocks);
    
    // Initial click handlers
    attachBlockClickHandlers();
}

function showBlockDetails(event) {
    if (event.target.classList.contains('remove-block')) return;
    
    const blockElement = event.currentTarget;
    const blockId = parseInt(blockElement.dataset.blockId);
    const block = blocks.find(b => b.id === blockId);
    
    if (!block) return;
    
    const modal = document.createElement('div');
    modal.className = 'block-details-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">×</button>
            <h2 class="modal-title">${block.title}</h2>
            <div class="modal-description">${block.description || 'No description provided'}</div>
            ${block.tags ? `
                <div class="modal-tags">
                    ${block.tags.split(',').map(tag => `
                        <span class="tag">${tag.trim()}</span>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', e => {
        if (e.target === modal || e.target.classList.contains('modal-close')) {
            modal.remove();
        }
    });
}

// Drag and drop handlers
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.blockId);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

function handleAssignedBlockDragStart(e) {
    const blockElement = e.target;
    // Store both block ID and daily block ID in the transfer data
    const data = {
        blockId: blockElement.dataset.blockId,
        dailyBlockId: blockElement.dataset.dailyBlockId,
        timeSlot: blockElement.dataset.timeSlot,
        sourceWeekId: blockElement.closest('.week-container').dataset.weekId,
        sourceDayNumber: blockElement.closest('.day-container').querySelector('.drop-zone').dataset.day
    };
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.target.classList.add('dragging');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const dayElement = e.currentTarget;
    const weekElement = dayElement.closest('.week-container');
    const weekId = parseInt(weekElement.dataset.weekId);
    const dayNumber = parseInt(dayElement.dataset.day);

    // First try to get text/plain data (for new blocks)
    const plainData = e.dataTransfer.getData('text/plain');
    if (plainData) {
        const blockId = parseInt(plainData);
        handleNewBlockDrop(blockId, weekId, dayNumber);
        return;
    }

    // If no text/plain data, try JSON data (for assigned blocks)
    try {
        const jsonData = e.dataTransfer.getData('application/json');
        if (jsonData) {
            const data = JSON.parse(jsonData);
            handleAssignedBlockDrop(data, weekId, dayNumber);
        }
    } catch (err) {
        console.error('Error handling drop:', err);
    }
}

function handleAssignedBlockDrop(data, targetWeekId, targetDayNumber) {
    const sourceWeekId = parseInt(data.sourceWeekId);
    const sourceDayNumber = parseInt(data.sourceDayNumber);
    const blockId = parseInt(data.blockId);
    const dailyBlockId = data.dailyBlockId === "null" ? null : parseInt(data.dailyBlockId);
    
    // Don't do anything if dropped in the same spot
    if (sourceWeekId === targetWeekId && sourceDayNumber === targetDayNumber) {
        return;
    }

    // Remove from source location
    const sourceWeek = editablePlan.weeks.find(w => w.id === sourceWeekId);
    if (sourceWeek && sourceWeek.days[sourceDayNumber]) {
        if (dailyBlockId === null) {
            sourceWeek.days[sourceDayNumber] = sourceWeek.days[sourceDayNumber].filter(block => 
                block.id !== blockId
            );
        } else {
            sourceWeek.days[sourceDayNumber] = sourceWeek.days[sourceDayNumber].filter(block => 
                block.daily_block_id !== dailyBlockId
            );
        }
    }

    // Add to target location
    const targetWeek = editablePlan.weeks.find(w => w.id === targetWeekId);
    if (!targetWeek.days[targetDayNumber]) {
        targetWeek.days[targetDayNumber] = [];
    }

    // Add block to new location
    targetWeek.days[targetDayNumber].push({
        id: blockId,
        daily_block_id: null, // Reset daily_block_id as this is effectively a new assignment
        time_slot: data.timeSlot
    });

    // Update currentPlan to match
    updateCurrentPlanBlocks(sourceWeekId, sourceDayNumber, targetWeekId, targetDayNumber, blockId, dailyBlockId);
    
    // Update UI
    renderPlan();
}

function handleNewBlockDrop(blockId, weekId, dayNumber) {
    // Find the block details from our blocks array
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Update editablePlan structure
    const week = editablePlan.weeks.find(w => w.id === weekId);
    if (!week) return;

    if (!week.days[dayNumber]) {
        week.days[dayNumber] = [];
    }
    
    const timeSlot = prompt('Enter time slot (e.g., 09:00):', '09:00');
    if (!timeSlot) return;

    // Add new block to the day
    week.days[dayNumber].push({
        id: blockId,
        daily_block_id: null,
        time_slot: timeSlot
    });

    // Update currentPlan
    const currentWeek = currentPlan.weeks.find(w => w.id === weekId);
    if (!currentWeek.days[dayNumber]) {
        currentWeek.days[dayNumber] = [];
    }
    
    currentWeek.days[dayNumber].push({
        id: blockId,
        daily_block_id: null,
        time_slot: timeSlot,
        title: block.title,
        description: block.description,
        tags: block.tags
    });

    // Update UI
    renderPlan();
}

function updateCurrentPlanBlocks(sourceWeekId, sourceDayNumber, targetWeekId, targetDayNumber, blockId, dailyBlockId) {
    // Remove from source
    const sourceWeek = currentPlan.weeks.find(w => w.id === sourceWeekId);
    if (sourceWeek && sourceWeek.days[sourceDayNumber]) {
        const blockToMove = sourceWeek.days[sourceDayNumber].find(b => 
            dailyBlockId === null ? b.id === blockId : b.daily_block_id === dailyBlockId
        );
        
        sourceWeek.days[sourceDayNumber] = sourceWeek.days[sourceDayNumber].filter(b => 
            dailyBlockId === null ? b.id !== blockId : b.daily_block_id !== dailyBlockId
        );

        // Add to target
        const targetWeek = currentPlan.weeks.find(w => w.id === targetWeekId);
        if (!targetWeek.days[targetDayNumber]) {
            targetWeek.days[targetDayNumber] = [];
        }

        if (blockToMove) {
            targetWeek.days[targetDayNumber].push({
                ...blockToMove,
                daily_block_id: null // Reset as this is effectively a new assignment
            });
        }
    }
}

function removeBlock(event) {
    event.preventDefault();
    const blockElement = event.target.closest('.assigned-block');
    const weekElement = blockElement.closest('.week-container');
    const dayElement = blockElement.closest('.day-container');
    
    const weekId = parseInt(weekElement.dataset.weekId);
    const dayNumber = parseInt(dayElement.querySelector('.drop-zone').dataset.day);
    const dailyBlockId = blockElement.dataset.dailyBlockId === "null" ? null : parseInt(blockElement.dataset.dailyBlockId);
    const blockId = parseInt(blockElement.dataset.blockId);

    // Update editablePlan
    const week = editablePlan.weeks.find(w => w.id === weekId);
    if (week && week.days[dayNumber]) {
        if (dailyBlockId === null) {
            // Remove newly added blocks that haven't been saved yet
            week.days[dayNumber] = week.days[dayNumber].filter(block => 
                block.id !== blockId
            );
        } else {
            // Remove existing blocks with a daily_block_id
            week.days[dayNumber] = week.days[dayNumber].filter(block => 
                block.daily_block_id !== dailyBlockId
            );
        }
    }

    // Update currentPlan
    const currentWeek = currentPlan.weeks.find(w => w.id === weekId);
    if (currentWeek && currentWeek.days[dayNumber]) {
        if (dailyBlockId === null) {
            currentWeek.days[dayNumber] = currentWeek.days[dayNumber].filter(block => 
                block.id !== blockId
            );
        } else {
            currentWeek.days[dayNumber] = currentWeek.days[dayNumber].filter(block => 
                block.daily_block_id !== dailyBlockId
            );
        }
    }

    // Update UI
    renderPlan();
}

// Load plan data
async function loadPlan() {
    try {
        const response = await fetch(`/api/plans/${planId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('Failed to load plan');
        
        currentPlan = await response.json();
        editablePlan = createEditablePlan(currentPlan);
        
        renderPlan();
    } catch (error) {
        console.error('Error loading plan:', error);
    }
}

function createEditablePlan(plan) {
    return {
        id: plan.id,
        title: plan.title,
        tags: plan.tags,
        is_favorited: plan.is_favorited,
        weeks: plan.weeks.map(week => ({
            id: week.id,
            week_number: week.week_number,
            days: Object.entries(week.days).reduce((acc, [day, blocks]) => {
                acc[day] = blocks.map(block => ({
                    id: block.id,                    // training_blocks.id
                    daily_block_id: block.daily_block_id,  // daily_blocks.id
                    time_slot: block.time_slot
                }));
                return acc;
            }, {})
        }))
    };
}

function renderPlan() {
    // Update title
    planTitle.textContent = currentPlan.title;

    // Render weeks and days
    planContent.innerHTML = currentPlan.weeks.map((week, weekIndex) => `
        <div class="week-container" data-week-id="${week.id}">
            <div class="week-header">
                <h3>Week ${week.week_number}</h3>
                ${weekIndex > 0 ? '<button onclick="deleteWeek(event)" class="delete-week">×</button>' : ''}
            </div>
            <div class="days-container">
                ${renderDays(week.days)}
            </div>
        </div>
    `).join('') + `
        <button onclick="addWeek()" class="add-week">+ Add Week</button>
    `;

    // Add drop zones event listeners
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('click', () => showBlockSelectionModal(zone));
    });

    // Add assigned blocks event listeners
    document.querySelectorAll('.assigned-block').forEach(block => {
        block.addEventListener('click', showBlockDetails);
        block.addEventListener('dragstart', handleAssignedBlockDragStart);
        block.addEventListener('dragend', handleDragEnd);
    });
}

function renderDays(days) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return daysOfWeek.map((dayName, index) => `
        <div class="day-container">
            <h4>${dayName}</h4>
            <div class="blocks-container">
                ${(days[index + 1] || []).map(block => `
                    <div class="assigned-block" 
                         draggable="true"
                         data-block-id="${block.id}" 
                         data-daily-block-id="${block.daily_block_id}"
                         data-time-slot="${block.time_slot}">
                        <div class="block-time">${block.time_slot || ''}</div>
                        <div class="block-info">
                            <div class="block-title">${block.title}</div>
                            <button onclick="removeBlock(event)" class="remove-block">×</button>
                        </div>
                    </div>
                `).join('')}
                <div class="drop-zone" data-day="${index + 1}">
                    <span>Drop block here</span>
                </div>
            </div>
        </div>
    `).join('');
}

function addWeek() {
    const lastWeek = currentPlan.weeks[currentPlan.weeks.length - 1];
    const newWeekNumber = lastWeek.week_number + 1;
    
    // Add to currentPlan
    const newWeek = {
        id: null,  // Will be assigned by server
        week_number: newWeekNumber,
        days: {}
    };
    currentPlan.weeks.push(newWeek);
    
    // Add to editablePlan
    editablePlan.weeks.push({
        id: null,
        week_number: newWeekNumber,
        days: {}
    });
    
    renderPlan();
}

function deleteWeek(event) {
    event.preventDefault();
    const weekElement = event.target.closest('.week-container');
    const weekId = parseInt(weekElement.dataset.weekId);
    
    if (!confirm('Are you sure you want to delete this week?')) return;
    
    // Remove from currentPlan
    currentPlan.weeks = currentPlan.weeks.filter(week => week.id !== weekId);
    
    // Remove from editablePlan
    editablePlan.weeks = editablePlan.weeks.filter(week => week.id !== weekId);
    
    // Renumber remaining weeks
    currentPlan.weeks.forEach((week, index) => {
        week.week_number = index + 1;
    });
    editablePlan.weeks.forEach((week, index) => {
        week.week_number = index + 1;
    });
    
    renderPlan();
}

// Initialize event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const blockTagFilter = document.getElementById('blockTagFilter');
    const blocksFavoritesOnly = document.getElementById('blocksFavoritesOnly');
    
    if (blockTagFilter) {
        blockTagFilter.addEventListener('change', filterBlocks);
    }
    
    if (blocksFavoritesOnly) {
        blocksFavoritesOnly.addEventListener('change', filterBlocks);
    }
    
    // Load initial data
    loadBlocks();
});
// New block creation
document.getElementById('newBlockBtn').addEventListener('click', async () => {
    const title = prompt('Enter block title:');
    if (!title) return;
    
    const description = prompt('Enter block description (optional):');
    const tags = prompt('Enter block tags (comma-separated, optional):');
    
    try {
        const response = await fetch('/api/blocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title, description, tags })
        });
        
        if (!response.ok) throw new Error('Failed to create block');
        
        const newBlock = await response.json();
        blocks.push(newBlock);
        renderBlocks();
    } catch (error) {
        console.error('Error creating block:', error);
    }
});

// Save changes
document.getElementById('saveBtn').addEventListener('click', async () => {
    console.log(editablePlan);
    try {
        const response = await fetch(`/api/plans/${planId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(editablePlan)
        });
        
        if (!response.ok) throw new Error('Failed to save plan');
        
        // Refresh the plan to get updated IDs
        loadPlan();
    } catch (error) {
        console.error('Error saving plan:', error);
    }
});

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/plans.html';
});

// Initialize the page
loadPlan();
loadBlocks();