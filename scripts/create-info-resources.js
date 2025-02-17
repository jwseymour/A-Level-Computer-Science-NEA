import fs from 'fs/promises';
import path from 'path';

const resourcesPath = path.join(process.cwd(), 'resources', 'information');

const resources = [
  {
    id: 'outdoor-boulder-beginner',
    title: 'Outdoor Bouldering Basics',
    description: 'Introduction to outdoor bouldering, covering essential safety practices, spotting techniques, and fundamental outdoor movement skills.',
    tags: [
      'outdoor-boulder',
      'level-2',
      'outdoor',
      'boulder',
      'beginner',
      'safety'
    ],
    node_id: 'outdoor-boulder-beginner'
  },
  {
    id: 'outdoor-boulder-intermediate',
    title: 'Intermediate Outdoor Boulder',
    description: 'Advancing outdoor bouldering skills with focus on complex movements, project management, and environmental awareness.',
    tags: [
      'outdoor-boulder',
      'level-3',
      'outdoor',
      'boulder',
      'intermediate',
      'technical'
    ],
    node_id: 'outdoor-boulder-intermediate'
  },
  {
    id: 'outdoor-boulder-advanced',
    title: 'Advanced Outdoor Boulder',
    description: 'Mastery of outdoor bouldering techniques, focusing on high-grade ascents, complex problem-solving, and advanced spotting systems.',
    tags: [
      'outdoor-boulder',
      'level-4',
      'outdoor',
      'boulder',
      'advanced',
      'technical'
    ],
    node_id: 'outdoor-boulder-advanced'
  }
];

async function createResourceFiles() {
  for (const resource of resources) {
    const resourceDir = path.join(resourcesPath, resource.id);
    
    // Create directory
    await fs.mkdir(resourceDir, { recursive: true });
    
    // Create index.yaml
    const yamlContent = `id: ${resource.id}
title: ${resource.title}
description: >-
  ${resource.description}
tags:
${resource.tags.map(tag => `  - ${tag}`).join('\n')}
created_at: '2024-03-21'
node_id: ${resource.node_id}
related_training_plans: []
`;
    
    await fs.writeFile(path.join(resourceDir, 'index.yaml'), yamlContent);
    
    // Create content.md
    await fs.writeFile(path.join(resourceDir, 'content.md'), getContentForResource(resource.id));
  }
}

function getContentForResource(id) {
  const contents = {
    'outdoor-boulder-beginner': `# Outdoor Bouldering Basics

## Level Description
Beginning outdoor boulderers focus on:
- Safety and spotting fundamentals
- Pad placement strategy
- Environmental awareness
- Basic outdoor movement

## Physical Benchmarks
- Indoor bouldering V3-V4
- Outdoor bouldering V1-V2
- Basic spotting strength
- Landing control
- Movement adaptation

## Key Areas for Improvement
1. Safety Skills
   - Spotting technique
   - Pad placement
   - Landing zone assessment
   - Environmental awareness

2. Technical Skills
   - Rock reading
   - Outdoor movement patterns
   - Hold identification
   - Cleaning and care

3. Mental Preparation
   - Height management
   - Fall commitment
   - Problem assessment
   - Environmental comfort

## Progression Strategies
- Guided outdoor sessions
- Systematic grade progression
- Safety skill practice
- Movement adaptation
- Environmental education`,

    'outdoor-boulder-intermediate': `# Intermediate Outdoor Boulder

## Level Description
Intermediate outdoor boulderers demonstrate:
- Advanced spotting techniques
- Complex pad arrangements
- Project management
- Environmental stewardship

## Physical Benchmarks
- Indoor bouldering V5-V6
- Outdoor bouldering V3-V5
- Strong spotting capability
- Complex movement adaptation
- Weather resistance

## Key Areas for Improvement
1. Advanced Skills
   - Complex spotting systems
   - Advanced pad strategy
   - Project management
   - Environmental protection

2. Technical Development
   - Advanced rock reading
   - Complex sequences
   - Hold adaptation
   - Weather assessment

3. Mental Growth
   - Project commitment
   - Risk assessment
   - Partnership skills
   - Environmental respect

## Progression Strategies
- Regular outdoor sessions
- Project-based learning
- Technical refinement
- Environmental advocacy
- Community involvement`,

    'outdoor-boulder-advanced': `# Advanced Outdoor Boulder

## Level Description
Advanced outdoor boulderers excel in:
- Elite movement adaptation
- Complex problem-solving
- Project management
- Community leadership

## Physical Benchmarks
- Indoor bouldering V7-V8
- Outdoor bouldering V6-V8
- Elite spotting capability
- Advanced movement mastery
- All-weather performance

## Key Areas for Improvement
1. Elite Skills
   - Complex problem-solving
   - Advanced spotting systems
   - Project development
   - Community leadership

2. Physical Development
   - Specialized strength
   - Power endurance
   - Recovery optimization
   - Injury prevention

3. Mental Mastery
   - Project commitment
   - Risk management
   - Teaching ability
   - Environmental advocacy

## Progression Strategies
- Elite project selection
- Community leadership
- Technical mastery
- Environmental stewardship
- Mentoring others`
  };
  
  return contents[id];
}

createResourceFiles();