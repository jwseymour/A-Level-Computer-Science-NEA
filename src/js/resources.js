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

    function renderGraph(graph, resources) {
        console.log('Graph data:', graph);
        console.log('Resources:', resources);
    
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
    
        // Draw nodes
        const nodes = svg.append('g')
            .selectAll('g')
            .data(graph.nodes)
            .enter().append('g')
            .attr('transform', d => `translate(${d.x},${d.y})`);
    
        // Rest of the node rendering code remains the same
        nodes.append('circle')
            .attr('r', 20)
            .attr('fill', d => {
                switch(d.discipline) {
                    case 'indoor-toprope': return '#ffcdd2';
                    case 'indoor-lead': return '#c8e6c9';
                    case 'indoor-boulder': return '#bbdefb';
                    default: return '#fff';
                }
            })
            .attr('stroke', d => {
                switch(d.level) {
                    case 1: return '#4caf50';
                    case 2: return '#2196f3';
                    case 3: return '#ff9800';
                    case 4: return '#f44336';
                    default: return '#333';
                }
            })
            .attr('stroke-width', 2);
    
        // Add text labels
        nodes.append('text')
            .text(d => {
                const words = d.title.split(' ');
                return words.length > 2 ? `${words[0]} ${words[1]}...` : d.title;
            })
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', '#333');
    
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
            const resource = resources.find(r => r.node_id === d.id);
            if (resource) {
                window.location.href = `/resource-detail.html?id=${resource.id}&type=information`;
            }
        });
    }

// Load resources
async function loadResources() {
    try {
        console.log('Loading resources...');
        const response = await fetch('/api/resources/information');
        console.log('Response received:', response);
        if (!response.ok) throw new Error('Failed to load resources');
        
        const data = await response.json();
        console.log('Parsed data:', data);
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