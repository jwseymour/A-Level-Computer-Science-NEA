// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
    window.location.href = '/auth.html';
}

const plansGrid = document.getElementById('plansGrid');
const newPlanBtn = document.getElementById('newPlanBtn');


let allPlans = [];
let uniqueTags = new Set();

// Update the renderPlans function (replaces the existing plansGrid.innerHTML assignment)
function renderPlans(plans) {
    plansGrid.innerHTML = plans.map(plan => `
        <div class="plan-card">
            <div class="plan-header">
                <h3>${plan.title}</h3>
                <div class="plan-actions">
                    <button class="icon-button favourite-btn ${plan.is_favourited ? 'active' : ''}" 
                            onclick="togglefavourite(${plan.id}, event)">
                        ★
                    </button>
                    <button class="icon-button delete-btn" 
                            onclick="deletePlan(${plan.id}, event)">
                        ×
                    </button>
                </div>
            </div>
            <p class="plan-date">${new Date(plan.created_at).toLocaleDateString()}</p>
            ${plan.tags ? `<p class="plan-tags">${plan.tags}</p>` : ''}
            <button class="view-btn" onclick="window.location.href='/plan-detail.html?id=${plan.id}'">
                View Plan
            </button>
        </div>
    `).join('');
}

async function loadPlans() {
    try {
        const response = await fetch('/api/plans', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        allPlans = await response.json();
        
        // Extract unique tags
        uniqueTags = new Set();
        allPlans.forEach(plan => {
            if (plan.tags) {
                plan.tags.split(',').forEach(tag => {
                    uniqueTags.add(tag.trim());
                });
            }
        });
        
        // Populate tag filter
        const tagFilter = document.getElementById('tagFilter');
        tagFilter.innerHTML = '<option value="">All Tags</option>' + 
            Array.from(uniqueTags).sort().map(tag => 
                `<option value="${tag}">${tag}</option>`
            ).join('');
        
        filterPlans();
    } catch (error) {
        console.error('Error loading plans:', error);
    }
}

function filterPlans() {
    const favouritesOnly = document.getElementById('favouritesOnly').checked;
    const selectedTag = document.getElementById('tagFilter').value;
    
    const filteredPlans = allPlans.filter(plan => {
        // favourites filter
        const matchesfavourite = !favouritesOnly || plan.is_favourited;
        
        // Tag filter
        const matchesTag = !selectedTag || 
            (plan.tags && plan.tags.split(',').map(t => t.trim()).includes(selectedTag));
        
        return matchesfavourite && matchesTag;
    });
    
    renderPlans(filteredPlans);
}

// Add delete functionality
async function deletePlan(planId, event) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this plan?')) {
        return;
    }

    try {
        const response = await fetch(`/api/plans/${planId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete plan');
        }

        loadPlans(); // Refresh the plans list
    } catch (error) {
        console.error('Error deleting plan:', error);
    }
}

// Add favourite functionality
async function togglefavourite(planId, event) {
    event.stopPropagation();
    try {
        const response = await fetch(`/api/plans/${planId}/favourite`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to toggle favourite');
        }

        loadPlans(); // Refresh the plans list
    } catch (error) {
        console.error('Error toggling favourite:', error);
    }
}

// Update createNewPlan to include tags
async function createNewPlan(title, tags = '') {
    try {
        const response = await fetch('/api/plans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                title,
                tags,
                weeks: [{ days: [] }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create plan');
        }

        const result = await response.json();
        window.location.href = `/plan-detail.html?id=${result.id}`;
    } catch (error) {
        console.error('Error creating plan:', error);
    }
}

document.getElementById('favouritesOnly').addEventListener('change', filterPlans);
document.getElementById('tagFilter').addEventListener('change', filterPlans);

// Handle new plan button click
newPlanBtn.addEventListener('click', () => {
    const title = prompt('Enter plan title:');
    if (title) {
        createNewPlan(title);
    }
});

// Load plans when page loads
loadPlans();