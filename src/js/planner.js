import { saveTrainingPlan, getTrainingPlans, deleteTrainingPlan } from './database.js';

// Check authentication
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
    window.location.href = '/auth.html';
}

class TrainingPlan {
    constructor(name) {
        this.name = name;
        this.weeks = [[]];  // Start with one empty week
    }

    addWeek() {
        this.weeks.push([]);
    }

    addBlock(weekIndex, dayIndex, block) {
        if (!this.weeks[weekIndex]) {
            this.weeks[weekIndex] = [];
        }
        if (!this.weeks[weekIndex][dayIndex]) {
            this.weeks[weekIndex][dayIndex] = [];
        }
        this.weeks[weekIndex][dayIndex].push(block);
        // Sort blocks by time
        this.weeks[weekIndex][dayIndex].sort((a, b) => a.time.localeCompare(b.time));
    }

    updateBlock(weekIndex, dayIndex, oldBlock, newBlock) {
        if (!this.weeks[weekIndex] || !this.weeks[weekIndex][dayIndex]) {
            return;
        }
        const dayBlocks = this.weeks[weekIndex][dayIndex];
        const index = dayBlocks.indexOf(oldBlock);
        if (index > -1) {
            dayBlocks[index] = newBlock;
            dayBlocks.sort((a, b) => a.time.localeCompare(b.time));
        }
    }
}

class PlannerUI {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.showPlansList();
    }

    initializeElements() {
        this.plansListView = document.getElementById('plansListView');
        this.planDetailView = document.getElementById('planDetailView');
        this.plansGrid = document.getElementById('plansGrid');
        this.weeksContainer = document.getElementById('weeksContainer');
        this.planNameElement = document.getElementById('planName');
        this.blockModal = document.getElementById('blockModal');
        this.blockForm = document.getElementById('blockForm');
    }

    bindEvents() {
        document.getElementById('createPlanBtn').addEventListener('click', () => this.createNewPlan());
        document.getElementById('backToPlansBtn').addEventListener('click', () => this.showPlansList());
        document.getElementById('savePlanBtn').addEventListener('click', () => this.savePlan());
        document.getElementById('addWeekBtn').addEventListener('click', () => this.addWeek());
        this.blockForm.addEventListener('submit', (e) => this.handleBlockSubmit(e));
        document.getElementById('cancelBlockBtn').addEventListener('click', () => this.hideBlockModal());
    }

    showPlansList() {
        this.plansListView.classList.remove('hidden');
        this.planDetailView.classList.add('hidden');
        this.renderPlansGrid();
    }

    async renderPlansGrid() {
        const plans = await getTrainingPlans();
        this.plansGrid.innerHTML = '';

        plans.forEach(plan => {
            const card = document.createElement('div');
            card.className = 'plan-card';
            card.innerHTML = `
                <h3>${plan.name}</h3>
                <div class="plan-card-actions">
                    <button class="edit-name-btn">Edit Name</button>
                    <button class="delete-plan-btn">Delete</button>
                </div>
            `;
            
            card.querySelector('h3').addEventListener('click', () => this.loadPlan(plan));
            
            card.querySelector('.edit-name-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const newName = prompt('Enter new name for plan:', plan.name);
                if (newName && newName !== plan.name) {
                    plan.name = newName;
                    await saveTrainingPlan(plan);
                    this.renderPlansGrid();
                }
            });

            card.querySelector('.delete-plan-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this plan?')) {
                    await deleteTrainingPlan(plan.id);
                    this.renderPlansGrid();
                }
            });

            this.plansGrid.appendChild(card);
        });
    }

    async savePlan() {
        await saveTrainingPlan(this.currentPlan);
        alert('Plan saved successfully!');
        this.showPlansList();
    }

    loadPlan(plan) {
        const loadedPlan = new TrainingPlan(plan.name);
        loadedPlan.weeks = plan.weeks;
        loadedPlan.id = plan.id;
        this.showPlanDetail(loadedPlan);
    }

    renamePlan(oldName, newName) {
        const plans = JSON.parse(localStorage.getItem('trainingPlans') || '{}');
        if (plans[oldName]) {
            plans[newName] = plans[oldName];
            plans[newName].name = newName;
            delete plans[oldName];
            localStorage.setItem('trainingPlans', JSON.stringify(plans));
            this.renderPlansGrid();
        }
    }

    deletePlan(planName) {
        const plans = JSON.parse(localStorage.getItem('trainingPlans') || '{}');
        delete plans[planName];
        localStorage.setItem('trainingPlans', JSON.stringify(plans));
        this.renderPlansGrid();
    }

    showPlanDetail(plan) {
        this.plansListView.classList.add('hidden');
        this.planDetailView.classList.remove('hidden');
        this.currentPlan = plan;
        this.planNameElement.textContent = plan.name;
        this.renderAllWeeks();
    }

    renderAllWeeks() {
        this.weeksContainer.innerHTML = '';
        this.currentPlan.weeks.forEach((week, weekIndex) => {
            const weekElement = this.createWeekElement(week, weekIndex);
            this.weeksContainer.appendChild(weekElement);
        });
    }

    createWeekElement(week, weekIndex) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'week';
        weekDiv.innerHTML = `
            <div class="week-header">
                <span>Week ${weekIndex + 1}</span>
                ${weekIndex > 0 ? '<button class="delete-week-btn">Delete Week</button>' : ''}
            </div>
            <div class="days-grid"></div>
        `;
    
        if (weekIndex > 0) {
            weekDiv.querySelector('.delete-week-btn').addEventListener('click', () => {
                this.deleteWeek(weekIndex);
            });
        }
    
        const daysGrid = weekDiv.querySelector('.days-grid');
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            .forEach((day, dayIndex) => {
                const dayElement = this.createDayElement(day, weekIndex, dayIndex);
                daysGrid.appendChild(dayElement);
            });
    
        return weekDiv;
    }
    
    deleteWeek(weekIndex) {
        if (confirm('Are you sure you want to delete this week? This action cannot be undone.')) {
            this.currentPlan.weeks.splice(weekIndex, 1);
            this.renderAllWeeks();
        }
    }

    createDayElement(dayName, weekIndex, dayIndex) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-container';
        dayDiv.innerHTML = `
            <h3>${dayName}</h3>
            <button class="add-block-btn" data-week="${weekIndex}" data-day="${dayIndex}">Add Block</button>
            <div class="blocks"></div>
        `;

        const blocks = this.currentPlan.weeks[weekIndex]?.[dayIndex] || [];
        const blocksContainer = dayDiv.querySelector('.blocks');
        blocks.forEach(block => this.renderBlock(blocksContainer, block));

        dayDiv.querySelector('.add-block-btn').addEventListener('click', () => {
            this.currentWeekIndex = weekIndex;
            this.currentDayIndex = dayIndex;
            this.showAddBlockModal();
        });

        return dayDiv;
    }

    renderBlock(container, block) {
        const blockElement = document.createElement('div');
        blockElement.className = 'block';
        blockElement.innerHTML = `
            <div class="block-preview">
                <div class="block-time">${block.time}</div>
                <div class="block-title">${block.title}</div>
            </div>
        `;
    
        blockElement.addEventListener('click', () => this.showBlockDetail(block));
        container.appendChild(blockElement);
    }
    
    showBlockDetail(block) {
        // Find the week and day indices for the block
        this.currentPlan.weeks.forEach((week, weekIndex) => {
            week.forEach((day, dayIndex) => {
                if (day && day.includes(block)) {
                    this.currentWeekIndex = weekIndex;
                    this.currentDayIndex = dayIndex;
                }
            });
        });
    
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content block-detail">
                <div class="block-time">${block.time}</div>
                <div class="block-title">${block.title}</div>
                <div class="block-description">${block.description || ''}</div>
                <div class="modal-buttons">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                    <button class="close-btn">Close</button>
                </div>
            </div>
        `;
    
        modal.querySelector('.edit-btn').addEventListener('click', () => {
            this.showEditBlockModal(block);
            document.body.removeChild(modal);
        });
    
        modal.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteBlock(block);
            document.body.removeChild(modal);
        });
    
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    
        document.body.appendChild(modal);
    }

    showAddBlockModal() {
        this.blockForm.reset();
        document.querySelector('#blockModal h2').textContent = 'Add Training Block';
        this.blockModal.classList.remove('hidden');
        this.isEditing = false;
    }
    
    showEditBlockModal(block) {
        document.querySelector('#blockModal h2').textContent = 'Edit Training Block';
        document.getElementById('blockTime').value = block.time;
        document.getElementById('blockTitle').value = block.title;
        document.getElementById('blockDescription').value = block.description || '';
        this.blockToEdit = block;
        this.blockModal.classList.remove('hidden');
        this.isEditing = true;
    }

    hideBlockModal() {
        this.blockModal.classList.add('hidden');
        this.blockToEdit = null;
        this.isEditing = false;
    }

    handleBlockSubmit(e) {
        e.preventDefault();
        const time = document.getElementById('blockTime').value;
        const title = document.getElementById('blockTitle').value;
        const description = document.getElementById('blockDescription').value;
        const block = { time, title, description };

        if (this.isEditing && this.blockToEdit) {
            this.currentPlan.updateBlock(
                this.currentWeekIndex,
                this.currentDayIndex,
                this.blockToEdit,
                block
            );
        } else {
            this.currentPlan.addBlock(
                this.currentWeekIndex,
                this.currentDayIndex,
                block
            );
        }

        this.hideBlockModal();
        this.renderAllWeeks();
    }
    
    deleteBlock(block) {
        if (confirm('Are you sure you want to delete this block?')) {
            const dayBlocks = this.currentPlan.weeks[this.currentWeekIndex][this.currentDayIndex];
            const index = dayBlocks.indexOf(block);
            if (index > -1) {
                dayBlocks.splice(index, 1);
                this.renderAllWeeks();
            }
        }
    }

    createNewPlan() {
        const planName = prompt('Enter name for new plan:');
        if (!planName) return;
        this.currentPlan = new TrainingPlan(planName);
        this.showPlanDetail(this.currentPlan);
    }

    addWeek() {
        this.currentPlan.addWeek();
        this.renderAllWeeks();
    }
}

// Initialize the planner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PlannerUI();
});