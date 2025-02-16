const resourcesGrid = document.getElementById('resourcesGrid');
const graphContainer = document.createElement('div');
graphContainer.id = 'disciplineGraph';
resourcesGrid.parentNode.insertBefore(graphContainer, resourcesGrid);

let graphData = null;
let allResources = [];

// Initialize D3 force simulation
const width = 800;
const height = 600;
const svg = d3.select('#disciplineGraph')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

// Create background group for discipline regions
const backgroundGroup = svg.append('g')
    .attr('class', 'discipline-regions');

// Create gradient definitions
const gradientDefs = svg.append('defs');

// Create arrow marker for edges
svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#999');

// Create tooltip div
const tooltip = d3.select('body').append('div')
    .attr('class', 'graph-tooltip')
    .style('opacity', 0);

let isPathPlottingMode = false;
let finishButton = null;
let selectedPath = [];

// Add toggle button for path plotting mode
const toggleButton = document.createElement('button');
toggleButton.className = 'primary-button';
toggleButton.textContent = 'Plot Training Path';
toggleButton.onclick = () => {
    isPathPlottingMode = !isPathPlottingMode;
    toggleButton.textContent = isPathPlottingMode ? 'Cancel Path' : 'Plot Training Path';
    
    // Reset path and styles regardless of new mode
    selectedPath = [];
    resetNodeStyles();
    suggestionContainer.style.display = 'none';
    
    if (isPathPlottingMode) {
        // Create and show finish button
        finishButton = document.createElement('button');
        finishButton.className = 'primary-button';
        finishButton.textContent = 'Finish Path';
        finishButton.style.marginLeft = '10px';
        finishButton.onclick = () => {
            if (selectedPath.length >= 2) {
                getSuggestedTrainingPlans(selectedPath);
                isPathPlottingMode = false;
                toggleButton.textContent = 'Plot Training Path';
                finishButton.remove();
                finishButton = null;
                setTimeout(() => {
                    suggestionContainer.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                alert('Please select at least 2 nodes for a path');
            }
        };
        toggleButton.parentNode.appendChild(finishButton);
    } else {
        // Remove finish button
        if (finishButton) {
            finishButton.remove();
            finishButton = null;
        }
    }
};
document.querySelector('.resources-header').appendChild(toggleButton);

// Add suggestion container
const suggestionContainer = document.createElement('div');
suggestionContainer.className = 'training-suggestions';
suggestionContainer.style.display = 'none';
document.querySelector('.resources-container').appendChild(suggestionContainer);

function resetNodeStyles() {
    svg.selectAll('rect')
        .attr('fill', 'white');
}

function createDisciplineRegions(nodes) {
    // Create Voronoi diagram based on node positions
    const voronoi = d3.Delaunay
        .from(nodes, d => d.x, d => d.y)
        .voronoi([0, 0, width, height]);

    // Create a polygon for each node
    const polygons = nodes.map((_, i) => voronoi.cellPolygon(i));

    // Group polygons by discipline
    const disciplinePolygons = {};
    nodes.forEach((node, i) => {
        if (!disciplinePolygons[node.discipline]) {
            disciplinePolygons[node.discipline] = [];
        }
        if (polygons[i]) {
            disciplinePolygons[node.discipline].push(polygons[i]);
        }
    });

    // For each discipline, create a merged path
    Object.entries(disciplinePolygons).forEach(([discipline, polygons]) => {
        // Convert polygons to path strings
        const pathStrings = polygons.map(polygon => {
            return `M${polygon.join('L')}Z`;
        });

        // Create merged path
        backgroundGroup.append('path')
            .attr('d', pathStrings.join(' '))
            .attr('class', `discipline-region ${discipline}`)
            .attr('fill', getBackgroundColor(discipline))
            .attr('opacity', 0.15)
            .attr('stroke', getBackgroundColor(discipline))
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.3);
    });
}

function getBackgroundColor(discipline) {
    switch(discipline) {
        case 'indoor-toprope': return '#ff5252';
        case 'indoor-lead': return '#4caf50';
        case 'indoor-boulder': return '#2196f3';
        default: return '#fff';
    }
}

function createNodeGradient(id, baseColor) {
    // Create radial gradient for the border
    const borderGradient = gradientDefs.append('radialGradient')
        .attr('id', `border-${id}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%')
        .attr('gradientUnits', 'userSpaceOnUse');
        
    borderGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', baseColor)
        .attr('stop-opacity', 0);
        
    borderGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', baseColor)
        .attr('stop-opacity', 0.3);
}

function wrap(text, width) {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        const lineHeight = 1.1; // ems
        const y = text.attr("y");
        const dy = parseFloat(text.attr("dy") || 0);
        let word;
        let line = [];
        let lineNumber = 0;
        let tspan = text.text(null).append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", 0)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
            }
        }
    });
}

function renderGraph(graph, resources) {
    // Calculate positions based on levels
    const levelGroups = {};
    const maxLevel = Math.max(...graph.nodes.map(n => n.level));
    
    // Group nodes by level
    graph.nodes.forEach(node => {
        if (!levelGroups[node.level]) {
            levelGroups[node.level] = [];
        }
        levelGroups[node.level].push(node);
    });

    // Calculate positions
    Object.entries(levelGroups).forEach(([level, nodes]) => {
        const levelY = height - (height * (level / (maxLevel + 1)));
        const spacing = width / (nodes.length + 1);
        
        nodes.forEach((node, index) => {
            node.x = spacing * (index + 1);
            node.y = levelY;
        });
    });

    // Draw edges
    const edges = svg.append('g')
        .selectAll('line')
        .data(graph.edges)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-width', 1)
        .attr('marker-end', 'url(#arrowhead)')
        .attr('x1', d => graph.nodes.find(n => n.id === d.from).x)
        .attr('y1', d => graph.nodes.find(n => n.id === d.from).y)
        .attr('x2', d => graph.nodes.find(n => n.id === d.to).x)
        .attr('y2', d => graph.nodes.find(n => n.id === d.to).y);

    // Create discipline regions
    createDisciplineRegions(graph.nodes);

    // Create gradients for each discipline
    createNodeGradient('gradient-toprope', '#ffcdd2');
    createNodeGradient('gradient-lead', '#c8e6c9');
    createNodeGradient('gradient-boulder', '#bbdefb');

    // Draw nodes
    const nodes = svg.append('g')
        .selectAll('g')
        .data(graph.nodes)
        .enter().append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`);

    // Calculate text size for each node
    nodes.each(function(d) {
        const text = d3.select(this).append('text')
            .text(d.title)
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('width', '120px') // Set max width
            .call(wrap, 120); // Wrap text function
            
        const bbox = text.node().getBBox();
        d.textWidth = Math.min(bbox.width, 120);
        d.textHeight = bbox.height;
        text.remove();
    });

    // Add background rectangles with gradient
    nodes.append('rect')
    .attr('width', d => d.textWidth + 20)
    .attr('height', d => d.textHeight + 10)
    .attr('x', d => -(d.textWidth + 20) / 2)
    .attr('y', d => -(d.textHeight + 10) / 2)
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('fill', 'white')
    .attr('stroke', d => {
        switch(d.discipline) {
            case 'indoor-toprope': return 'url(#border-gradient-toprope)';
            case 'indoor-lead': return 'url(#border-gradient-lead)';
            case 'indoor-boulder': return 'url(#border-gradient-boulder)';
            default: return '#33333333';
        }
    })
    .attr('stroke-width', 4);

    // Add text labels with wrapping
    nodes.append('text')
        .text(d => d.title)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .call(wrap, 120);

    // Hover effects remain the same
    nodes.on('mouseover', (event, d) => {
        const resource = resources.find(r => r.node_id === d.id);
        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        tooltip.html(`
            <h3>${d.title}</h3>
            <p>${resource?.description || ''}</p>
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', () => {
        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    })
    .on('click', (event, d) => {
        if (isPathPlottingMode) {
            const lastNode = selectedPath[selectedPath.length - 1];
            
            // Check if this is a valid next node
            if (selectedPath.length === 0 || 
                graph.edges.some(e => e.from === lastNode.id && e.to === d.id)) {
                
                if (!selectedPath.includes(d.id)) {
                    // Find the corresponding resource with related training plans
                    const resourceData = resources.find(r => r.node_id === d.id);
                    // Merge node data with resource data
                    const nodeWithResource = {
                        ...d,
                        related_training_plans: resourceData?.related_training_plans || []
                    };
                    selectedPath.push(nodeWithResource);  // Store the merged data
                    d3.select(event.currentTarget).select('rect')
                        .attr('fill', '#bcbcbc');
                }
            }
        } else {
            const resource = resources.find(r => r.node_id === d.id);
            if (resource) {
                window.location.href = `/resource-detail.html?id=${resource.id}&type=information`;
            }
        }
    });
}

async function getSuggestedTrainingPlans(path) {
    try {
        const response = await fetch('/api/resources/training/suggest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        });
        
        if (!response.ok) throw new Error('Failed to get suggestions');
        
        const suggestions = await response.json();
        displaySuggestions(suggestions);
    } catch (error) {
        console.error('Error getting suggestions:', error);
    }
}

function displaySuggestions(suggestions) {
    suggestionContainer.style.display = 'block';
    suggestionContainer.innerHTML = `
        <h2>Recommended Training Plans</h2>
        <div class="suggestion-list">
            ${suggestions.map(plan => `
                <div class="suggestion-card">
                    <h3>${plan.title}</h3>
                    <p>${plan.description}</p>
                    <p class="match-score">Match Score: ${plan.matchScore}%</p>
                    <a href="/resource-detail.html?id=${plan.id}&type=training" 
                       class="primary-button">View Plan</a>
                </div>
            `).join('')}
        </div>
    `;
}

// Load resources
async function loadResources() {
    try {
        const response = await fetch('/api/resources/information');
        if (!response.ok) throw new Error('Failed to load resources');
        
        const data = await response.json();
        graphData = data.graph;
        allResources = data.resources;

        renderGraph(graphData, allResources);
    } catch (error) {
        console.error('Error loading resources:', error);
        resourcesGrid.innerHTML = '<p class="error-message">Failed to load resources</p>';
    }
}

// Call loadResources when the page loads
document.addEventListener('DOMContentLoaded', loadResources);