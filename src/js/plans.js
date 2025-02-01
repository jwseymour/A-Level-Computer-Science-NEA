// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
    window.location.href = '/auth.html';
}

const plansGrid = document.getElementById('plansGrid');
const newPlanBtn = document.getElementById('newPlanBtn');

// Fetch and display plans
async function loadPlans() {
    try {
        const response = await fetch('/api/plans', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const plans = await response.json();
        
        plansGrid.innerHTML = plans.map(plan => `
            <div class="plan-card" onclick="window.location.href='/plan-detail.html?id=${plan.id}'">
                <h3>${plan.title}</h3>
                <p class="plan-date">${new Date(plan.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading plans:', error);
    }
}

// Create new plan
async function createNewPlan(title) {
    try {
        const response = await fetch('/api/plans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                title,
                weeks: [] // Start with empty weeks
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

// Handle new plan button click
newPlanBtn.addEventListener('click', () => {
    const title = prompt('Enter plan title:');
    if (title) {
        createNewPlan(title);
    }
});

// Load plans when page loads
loadPlans();