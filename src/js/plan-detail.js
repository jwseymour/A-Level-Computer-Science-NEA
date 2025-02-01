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

// Load training blocks
async function loadBlocks() {
    try {
        const response = await fetch('/api/blocks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
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
            <div class="block-title">${block.title}</div>
            <div class="block-description">${block.description || ''}</div>
        </div>
    `).join('');

    // Add drag event listeners
    document.querySelectorAll('.block-item').forEach(block => {
        block.addEventListener('dragstart', handleDragStart);
        block.addEventListener('dragend', handleDragEnd);
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

function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.currentTarget;
    dropZone.classList.remove('dragover');
    
    const blockId = e.dataTransfer.getData('text/plain');
    const dayIndex = dropZone.dataset.dayIndex;
    const weekIndex = dropZone.dataset.weekIndex;

    // Initialize currentPlan if it doesn't exist
    if (!currentPlan) {
        currentPlan = {
            title: planTitle.textContent,
            weeks: []
        };
    }
    
    // Initialize weeks array if it doesn't exist
    if (!currentPlan.weeks) {
        currentPlan.weeks = [];
    }
    
    // Ensure the week exists with proper initialization
    while (currentPlan.weeks.length <= weekIndex) {
        currentPlan.weeks.push({
            weekNumber: currentPlan.weeks.length + 1,
            days: []
        });
    }

    // Ensure the days array exists
    if (!currentPlan.weeks[weekIndex].days) {
        currentPlan.weeks[weekIndex].days = [];
    }

    // Find or create the day
    let day = currentPlan.weeks[weekIndex].days.find(d => d.dayOfWeek === parseInt(dayIndex));
    if (!day) {
        day = { dayOfWeek: parseInt(dayIndex), blocks: [] };
        currentPlan.weeks[weekIndex].days.push(day);
    }

    // Initialize blocks array if it doesn't exist
    if (!day.blocks) {
        day.blocks = [];
    }

    // Get time input
    let time;
    while (!time) {
        const input = prompt('Enter the time (24-hour format, e.g., "09:00" or "14:30"):');
        if (!input) return; // User cancelled
        
        if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(input)) {
            time = input;
        } else {
            alert('Please enter a valid time in 24-hour format (e.g., "09:00" or "14:30")');
        }
    }

    // Add the block
    day.blocks.push({
        blockId: parseInt(blockId),
        time: time
    });
    
    // Sort blocks by time
    day.blocks.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    renderPlan();
}

// Load plan data
async function loadPlan() {
    if (!planId) {
        window.location.href = '/plans.html';
        return;
    }

    try {
        const response = await fetch(`/api/plans/${planId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Plan not found');
        }

        const plan = await response.json();

        console.log(plan)
        
        // Validate that the plan belongs to the current user
        if (plan.user_id !== user.id) {
            window.location.href = '/plans.html';
            return;
        }

        planTitle.textContent = plan.title;

        currentPlan = plan;
        renderPlan();
        
    } catch (error) {
        console.error('Error loading plan:', error);
        window.location.href = '/plans.html';
    }
}

function renderPlan() {
    if (!currentPlan) return;
    console.log(currentPlan);

    const weeksContainer = document.createElement('div');
    weeksContainer.className = 'weeks-container';

    currentPlan.weeks.forEach((week, weekIndex) => {
        console.log(week);
        const weekCard = document.createElement('div');
        weekCard.className = 'week-card';
        weekCard.innerHTML = `<h2>Week ${weekIndex + 1}</h2>`;

        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';

        // Create columns for each day of the week
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        daysOfWeek.forEach((dayName, dayIndex) => {
            console.log(dayName);
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.innerHTML = `<h3>${dayName}</h3>`;

            // Single drop zone per day
            const dropZone = document.createElement('div');
            dropZone.className = 'drop-zone';
            dropZone.dataset.dayIndex = dayIndex;
            dropZone.dataset.weekIndex = weekIndex;
            
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);

            // Add existing blocks if any
            // Add existing blocks if any
            const day = week.days?.find(d => d.dayOfWeek === dayIndex);

            if (day) {
                // Handle both single block and multiple blocks formats
                if (day.blocks && Array.isArray(day.blocks)) {
                    // Multiple blocks format
                    const sortedBlocks = [...day.blocks].sort((a, b) => {
                        const timeA = a.time.split(':').map(Number);
                        const timeB = b.time.split(':').map(Number);
                        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                    });

                    sortedBlocks.forEach(blockData => {
                        const block = blocks.find(b => b.id === blockData.blockId);
                        if (block) {
                            const blockElement = document.createElement('div');
                            blockElement.className = 'block-card';
                            blockElement.innerHTML = `
                                <div class="block-time">${blockData.time}</div>
                                <div class="block-title">${block.title}</div>
                                <div class="block-description">${block.description || ''}</div>
                            `;
                            dropZone.appendChild(blockElement);
                        }
                    });
                } else if (day.blockId) {
                    // Single block format
                    const block = blocks.find(b => b.id === day.blockId);
                    if (block) {
                        const blockElement = document.createElement('div');
                        blockElement.className = 'block-card';
                        blockElement.innerHTML = `
                            <div class="block-title">${block.title}</div>
                            <div class="block-description">${block.description || ''}</div>
                        `;
                        dropZone.appendChild(blockElement);
                    }
                }
}

            dayColumn.appendChild(dropZone);
            daysGrid.appendChild(dayColumn);
        });

        weekCard.appendChild(daysGrid);
        weeksContainer.appendChild(weekCard);
    });

    planContent.innerHTML = '';
    planContent.appendChild(weeksContainer);
}

// New block creation
document.getElementById('newBlockBtn').addEventListener('click', async () => {
    const title = prompt('Enter block title:');
    if (!title) return;
    
    const description = prompt('Enter block description (optional):');
    
    try {
        const response = await fetch('/api/blocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title, description })
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
    try {
        const response = await fetch(`/api/plans/${planId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(currentPlan)
        });
        
        if (!response.ok) throw new Error('Failed to save changes');
        
        alert('Changes saved successfully!');
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('Failed to save changes');
    }
});

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/plans.html';
});

// Initialize the page
loadPlan();
loadBlocks();