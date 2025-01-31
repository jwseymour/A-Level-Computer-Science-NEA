async function getTrainingPlans() {
    const user = JSON.parse(localStorage.getItem('user'));
    const response = await fetch(`/api/training-plans/${user.id}`);
    if (!response.ok) throw new Error('Failed to fetch plans');
    return response.json();
}

async function saveTrainingPlan(plan) {
    console.log(plan);
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!plan.id) {
        // Create new plan
        const response = await fetch('/api/training-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: plan.name, userId: user.id })
        });
        if (!response.ok) throw new Error('Failed to create plan');
        const { id } = await response.json();
        plan.id = id;
    }
    
    // Save blocks
    const blocks = [];
    plan.weeks.forEach((week, weekIndex) => {
        week.forEach((day, dayIndex) => {
            if (day) {
                day.forEach(block => {
                    blocks.push({
                        ...block,
                        weekNumber: weekIndex,
                        dayNumber: dayIndex
                    });
                });
            }
        });
    });
    
    const response = await fetch(`/api/training-plans/${plan.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
    });
    
    if (!response.ok) throw new Error('Failed to save blocks');
    return plan.id;
}

async function deleteTrainingPlan(id) {
    const response = await fetch(`/api/training-plans/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete plan');
}

export { saveTrainingPlan, getTrainingPlans, deleteTrainingPlan };