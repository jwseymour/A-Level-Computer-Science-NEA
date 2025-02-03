const resourcesGrid = document.getElementById('resourcesGrid');
const tagFilter = document.getElementById('resourceTagFilter');

let allResources = [];
let uniqueTags = new Set();

// Render resources
function renderResources(resources) {
    resourcesGrid.innerHTML = resources.map(resource => `
        <div class="resource-card">
            <h3 class="resource-title">${resource.title}</h3>
            ${resource.tags ? `
                <div class="resource-tags">
                    ${resource.tags.split(',').map(tag => `
                        <span class="resource-tag">${tag.trim()}</span>
                    `).join('')}
                </div>
            ` : ''}
            <p class="resource-preview">${resource.description || ''}</p>
            <div class="resource-actions">
                <button class="primary-button" onclick="window.location.href='/resource-detail.html?id=${resource.id}'">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Filter resources based on selected tag
function filterResources() {
    const selectedTag = tagFilter.value;
    const filteredResources = selectedTag
        ? allResources.filter(resource => 
            resource.tags && resource.tags.split(',').map(t => t.trim()).includes(selectedTag)
          )
        : allResources;
    
    renderResources(filteredResources);
}

// Load resources
async function loadResources() {
    try {
        const response = await fetch('/api/resources');
        if (!response.ok) throw new Error('Failed to load resources');
        
        allResources = await response.json();

        // Extract unique tags
        uniqueTags = new Set();
        allResources.forEach(resource => {
            if (resource.tags) {
                resource.tags.split(',').forEach(tag => {
                    uniqueTags.add(tag.trim());
                });
            }
        });

        // Populate tag filter
        tagFilter.innerHTML = '<option value="">All Tags</option>' + 
            Array.from(uniqueTags).sort().map(tag => 
                `<option value="${tag}">${tag}</option>`
            ).join('');

        renderResources(allResources);
    } catch (error) {
        console.error('Error loading resources:', error);
        resourcesGrid.innerHTML = '<p class="error-message">Failed to load resources</p>';
    }
}

// event listener for tag filter
tagFilter.addEventListener('change', filterResources);

// Load resources when page loads
loadResources();