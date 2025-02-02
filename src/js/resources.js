const resourcesGrid = document.getElementById('resourcesGrid');

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

// Load resources
async function loadResources() {
    try {
        const response = await fetch('/api/resources');
        if (!response.ok) throw new Error('Failed to load resources');
        const resources = await response.json();
        renderResources(resources);
    } catch (error) {
        console.error('Error loading resources:', error);
        resourcesGrid.innerHTML = '<p class="error-message">Failed to load resources</p>';
    }
}

// Load resources when page loads
loadResources();