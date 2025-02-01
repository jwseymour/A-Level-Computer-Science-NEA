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
    // handle drop logic
}

// Load plan data
async function loadPlan() {
    //load plan logic
}

function renderPlan() {
    // render plan logic
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
    // save button logic
});

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/plans.html';
});

// Initialize the page
loadPlan();
loadBlocks();