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

        // Create weeks display
        const weeksContainer = document.createElement('div');
        weeksContainer.className = 'weeks-container';

        // Parse weeks if it's a string
        const weeks = typeof plan.weeks === 'string' ? JSON.parse(plan.weeks) : plan.weeks;

        weeks.forEach((week, weekIndex) => {
            const weekElement = document.createElement('div');
            weekElement.className = 'week-card';
            
            const weekHeader = document.createElement('h2');
            weekHeader.textContent = `Week ${week.weekNumber}`;
            weekElement.appendChild(weekHeader);

            // Create days grid
            const daysGrid = document.createElement('div');
            daysGrid.className = 'days-grid';

            // Create columns for each day of the week
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            daysOfWeek.forEach((dayName, dayIndex) => {
                const dayColumn = document.createElement('div');
                dayColumn.className = 'day-column';
                
                const dayHeader = document.createElement('h3');
                dayHeader.textContent = dayName;
                dayColumn.appendChild(dayHeader);

                // Find blocks for this day
                const dayData = week.days?.find(d => d.dayOfWeek === dayIndex) || { blocks: [] };
                
                if (dayData.blocks) {
                    dayData.blocks.forEach(block => {
                        const blockElement = document.createElement('div');
                        blockElement.className = 'block-card';
                        blockElement.innerHTML = `
                            <span class="time-slot">${block.timeSlot}</span>
                            <span class="block-id">Block ${block.blockId}</span>
                        `;
                        dayColumn.appendChild(blockElement);
                    });
                }

                daysGrid.appendChild(dayColumn);
            });

            weekElement.appendChild(daysGrid);
            weeksContainer.appendChild(weekElement);
        });

        planContent.innerHTML = '';
        planContent.appendChild(weeksContainer);
        
    } catch (error) {
        console.error('Error loading plan:', error);
        window.location.href = '/plans.html';
    }
}

// Initialize the page
loadPlan();