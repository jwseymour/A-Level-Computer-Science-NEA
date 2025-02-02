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

// Load training blocks
async function loadBlocks() {
    try {
        const response = await fetch('/api/blocks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('Failed to load blocks');
        blocks = await response.json();
        renderBlocks();
    } catch (error) {
        console.error('Error loading blocks:', error);
    }
}

function renderBlocks() {
    const blocksList = document.getElementById('blocksList');
    blocksList.innerHTML = blocks.map(block => `
        <div class="block-item" draggable="true" data-block-id="${block.id}">
            <div class="block-header">
                <div class="block-title">${block.title}</div>
                <div class="block-actions">
                    <button onclick="editBlock(${block.id}, event)">✎</button>
                    <button onclick="deleteBlock(${block.id}, event)">×</button>
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
        renderBlocks();
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
        renderBlocks();
    } catch (error) {
        console.error('Error deleting block:', error);
    }
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

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const blockId = parseInt(e.dataTransfer.getData('text/plain'));
    const dayElement = e.currentTarget;
    const weekElement = dayElement.closest('.week-container');
    
    const weekId = parseInt(weekElement.dataset.weekId);
    const dayNumber = parseInt(dayElement.dataset.day);
    
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

    // Update currentPlan to match editablePlan for this change
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
    });
}

function renderDays(days) {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return daysOfWeek.map((dayName, index) => `
        <div class="day-container">
            <h4>${dayName}</h4>
            <div class="blocks-container">
                ${(days[index + 1] || []).map(block => `
                    <div class="assigned-block" data-block-id="${block.id}" data-daily-block-id="${block.daily_block_id}">
                        <div class="block-time">${block.time_slot || ''}</div>
                        <div class="block-info">
                            <div class="block-title">${block.title}</div>
                            <button onclick="removeBlock(event)" class="remove-block">×</button>
                        </div>
                    </div>
                `).join('')}
                <div class="drop-zone" data-day="${index + 1}">
                    Drop block here
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