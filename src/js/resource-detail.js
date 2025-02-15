// Get the resource ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const resourceId = urlParams.get('id');

// Get DOM elements
const resourceTitle = document.getElementById('resourceTitle');
const resourceDescription = document.getElementById('resourceDescription');
const resourceTags = document.getElementById('resourceTags');
const resourceContent = document.getElementById('resourceContent');
const resourcePlans = document.getElementById('resourcePlans');
const resourceBlocks = document.getElementById('resourceBlocks');

const mdxRenderer = new marked.Renderer();

// Check if user is logged in (for copyable content)
const user = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token');

// Load resource data
async function loadResource() {
    try {
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/resources/${resourceId}`, { headers });
        if (!response.ok) throw new Error('Failed to load resource');
        
        const resource = await response.json();
        renderResource(resource);
    } catch (error) {
        console.error('Error loading resource:', error);
    }
}

function renderResource(resource) {
    // Set title and description
    resourceTitle.textContent = resource.title;
    resourceDescription.textContent = resource.description || '';
    
    // Render tags if they exist
    if (resource.tags) {
        const tags = Array.isArray(resource.tags) ? resource.tags : resource.tags.split(',');
        resourceTags.innerHTML = tags.map(tag => `
            <span class="resource-tag">${tag.trim()}</span>
        `).join('');
    }
    
    // Render MDX content
    resourceContent.innerHTML = marked.parse(resource.content || '', {
        renderer: mdxRenderer,
        breaks: true,
        gfm: true
    });

    // Render plans if they exist
    if (resource.plans && resource.plans.length > 0) {
        resourcePlans.innerHTML = resource.plans.map(plan => `
            <div class="plan-card">
                <div class="plan-header">
                    <h3>${plan.title}</h3>
                    ${user ? `
                        <button class="primary-button" onclick="copyPlan(${JSON.stringify(user.id ? resource.copyablePlans?.find(p => p.title === plan.title) || plan : plan).replace(/"/g, '&quot;')})">
                            Copy to My Plans
                        </button>
                    ` : ''}
                </div>
                ${plan.tags ? `<p class="plan-tags">${Array.isArray(plan.tags) ? plan.tags.join(', ') : plan.tags}</p>` : ''}
            </div>
        `).join('');
    } else {
        document.querySelector('.training-plans-section').style.display = 'none';
    }

    // Render blocks if they exist
    if (resource.blocks && resource.blocks.length > 0) {
        resourceBlocks.className = 'resource-blocks-list';
        resourceBlocks.innerHTML = resource.blocks.map(block => `
            <div class="resource-block-item">
                <div class="resource-block-header">
                    <div class="resource-block-title">${block.title}</div>
                    ${user ? `
                        <button class="primary-button" onclick="copyBlock(${JSON.stringify(user.id ? resource.copyableBlocks?.find(b => b.title === block.title) || block : block).replace(/"/g, '&quot;')})">
                            Copy
                        </button>
                    ` : ''}
                </div>
                <div class="resource-block-description">${block.description || ''}</div>
                ${block.tags ? `
                    <div class="resource-block-tags">
                        ${(Array.isArray(block.tags) ? block.tags : block.tags.split(',')).map(tag => `
                            <span class="resource-tag">${tag.trim()}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } else {
        document.querySelector('.training-blocks-section').style.display = 'none';
    }
}

// Copy plan to user's collection
async function copyPlan(plan) {
    try {
        // Get all unique block IDs from the plan
        const uniqueBlockIds = new Set();
        plan.weeks.forEach(week => {
            Object.values(week.days).forEach(blocks => {
                blocks.forEach(block => {
                    uniqueBlockIds.add(block.block); // This is the YAML block ID
                });
            });
        });

        // Create the plan structure with proper block references
        const planToSend = {
            title: plan.title,
            tags: Array.isArray(plan.tags) ? plan.tags.join(',') : plan.tags,
            weeks: plan.weeks.map(week => ({
                week_number: week.week_number,
                days: Object.fromEntries(
                    Object.entries(week.days).map(([day, blocks]) => [
                        day,
                        blocks.map(block => ({
                            blockId: `${resourceId}/${block.block}`, // Include resource ID in path
                            time_slot: block.time_slot
                        }))
                    ])
                )
            }))
        };

        const response = await fetch('/api/plans/copy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(planToSend)
        });
        
        if (!response.ok) throw new Error('Failed to copy plan');
        
        const result = await response.json();
        alert('Plan and training blocks copied successfully!');
        window.location.href = `/plan-detail.html?id=${result.planId}`;
    } catch (error) {
        console.error('Error copying plan:', error);
        alert('Failed to copy plan');
    }
}

// Copy block to user's collection
async function copyBlock(block) {
    try {
        // Ensure block has all required fields from YAML structure
        const blockToSend = {
            title: block.title,
            description: block.description,
            tags: Array.isArray(block.tags) ? block.tags.join(',') : block.tags
        };

        const response = await fetch('/api/blocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(blockToSend)
        });
        
        if (!response.ok) throw new Error('Failed to copy block');
        
        alert('Block copied successfully!');
    } catch (error) {
        console.error('Error copying block:', error);
        alert('Failed to copy block');
    }
}

// Back button handler
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/resources.html';
});

// Initialize the page
loadResource();