import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

async function createInfoResources() {
    try {
        // Read the graph.yaml file
        const graphContent = await fs.readFile(
            path.join(process.cwd(), 'resources', 'graph.yaml'),
            'utf8'
        );
        const graph = yaml.load(graphContent);

        // Get existing resources
        const infoDir = path.join(process.cwd(), 'resources', 'information');
        const existingResources = await fs.readdir(infoDir);

        // Process each node from the graph
        for (const node of graph.nodes) {
            if (!existingResources.includes(node.id)) {
                await createResourceForNode(node);
            }
        }

        console.log('Information resources created successfully!');
    } catch (error) {
        console.error('Error creating resources:', error);
    }
}

async function createResourceForNode(node) {
    const resourceDir = path.join(
        process.cwd(),
        'resources',
        'information',
        node.id
    );

    // Create resource directory
    await fs.mkdir(resourceDir, { recursive: true });

    // Create index.yaml
    const indexContent = {
        id: node.id,
        title: node.title,
        description: generateDescription(node),
        tags: generateTags(node),
        created_at: new Date().toISOString().split('T')[0],
        node_id: node.id
    };

    await fs.writeFile(
        path.join(resourceDir, 'index.yaml'),
        yaml.dump(indexContent)
    );

    // Create content.md
    await fs.writeFile(
        path.join(resourceDir, 'content.md'),
        generateContent(node)
    );
}

function generateDescription(node) {
    const levelTexts = {
        1: "beginner-friendly introduction",
        2: "intermediate-level guide",
        3: "advanced exploration",
        4: "expert-level deep dive"
    };

    return `A comprehensive ${levelTexts[node.level]} to ${node.title.toLowerCase()}, covering essential techniques, safety considerations, and best practices.`;
}

function generateTags(node) {
    const tags = [
        node.discipline,
        `level-${node.level}`,
        ...node.discipline.split('-')
    ];

    const levelTags = {
        1: ['beginner', 'fundamentals', 'basics'],
        2: ['intermediate', 'progression'],
        3: ['advanced', 'technical'],
        4: ['expert', 'mastery']
    };

    return [...new Set([...tags, ...levelTags[node.level]])];
}

function generateContent(node) {
    const levelContent = {
        1: generateBeginnerContent(node),
        2: generateIntermediateContent(node),
        3: generateAdvancedContent(node),
        4: generateExpertContent(node)
    };

    return levelContent[node.level];
}

function generateBeginnerContent(node) {
    return `# ${node.title}

## Overview
An introduction to ${node.title.toLowerCase()}, focusing on building a strong foundation in the fundamentals of ${node.discipline.replace('-', ' ')}.

## Key Learning Objectives
- Understanding basic safety protocols and equipment
- Learning proper body positioning and movement
- Developing fundamental technique
- Building confidence on the wall

## Safety Fundamentals
- Equipment checks and proper usage
- Communication protocols
- Basic risk assessment
- Emergency procedures

## Essential Techniques
- Body positioning
- Footwork basics
- Hand holds and grips
- Movement patterns
- Balance and weight distribution

## Common Mistakes to Avoid
- Overgripping
- Poor footwork
- Incorrect body positioning
- Rushing movements

## Progress Markers
- Consistent safety checks
- Proper technique execution
- Movement confidence
- Basic problem-solving skills

## Next Steps
Once you're comfortable with these fundamentals, you can progress to more advanced techniques and challenging routes.`;
}

function generateIntermediateContent(node) {
    return `# ${node.title}

## Overview
Building on fundamental skills, this guide focuses on refining technique and developing efficiency in ${node.discipline.replace('-', ' ')}.

## Advanced Techniques
- Dynamic movement
- Route reading strategies
- Energy conservation
- Advanced footwork
- Body tension

## Movement Efficiency
- Momentum utilization
- Rest positions
- Breathing techniques
- Sequence optimization

## Mental Training
- Focus techniques
- Stress management
- Visualization practices
- Performance preparation

## Training Concepts
- Strength development
- Endurance building
- Flexibility requirements
- Recovery strategies

## Common Challenges
- Plateau breaking
- Technical barriers
- Mental blocks
- Physical limitations

## Progress Assessment
- Movement quality
- Technical precision
- Problem-solving ability
- Physical conditioning`;
}

function generateAdvancedContent(node) {
    return `# ${node.title}

## Overview
Advanced-level instruction focusing on mastery of complex techniques and sophisticated movement patterns in ${node.discipline.replace('-', ' ')}.

## Advanced Concepts
- Complex movement patterns
- Advanced route reading
- Energy system optimization
- Performance psychology
- Training periodization

## Technical Mastery
- Subtle body positioning
- Advanced sequence optimization
- Specialized techniques
- Power application
- Technical problem-solving

## Performance Optimization
- Mental preparation
- Competition strategies
- Peak performance timing
- Recovery optimization
- Injury prevention

## Training Integration
- Periodization strategies
- Performance analysis
- Weakness identification
- Targeted improvement

## Expert Considerations
- Risk management
- Training load balance
- Long-term progression
- Sustainable development

## Mastery Indicators
- Technical excellence
- Movement efficiency
- Mental resilience
- Performance consistency`;
}

function generateExpertContent(node) {
    return `# ${node.title}

## Overview
Expert-level guidance for mastering the most complex aspects of ${node.discipline.replace('-', ' ')}, focusing on performance optimization and technical excellence.

## Elite Techniques
- Complex movement systems
- Advanced problem-solving
- Performance optimization
- Technical innovation
- Strategic mastery

## Performance Psychology
- Elite mindset development
- Pressure management
- Competition psychology
- Mental toughness
- Flow state access

## Training Systems
- Advanced periodization
- Performance analysis
- Recovery optimization
- Injury prevention
- Long-term development

## Technical Excellence
- Movement efficiency
- Energy system optimization
- Technical precision
- Strategic thinking
- Innovation in technique

## Mastery Development
- Continuous improvement
- Knowledge integration
- Teaching capability
- Community leadership
- Sport contribution

## Legacy Building
- Technique development
- Knowledge sharing
- Community impact
- Sport advancement
- Personal growth`;
}

createInfoResources();