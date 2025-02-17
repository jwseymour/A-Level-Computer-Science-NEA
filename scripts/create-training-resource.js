import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const resourceId = 'advanced-trad-outdoor';
const trainingDir = path.join(process.cwd(), 'resources', 'training');

async function createTrainingResource() {
    const resourcePath = path.join(trainingDir, resourceId);
    
    await fs.mkdir(resourcePath, { recursive: true });
    await fs.mkdir(path.join(resourcePath, 'blocks'), { recursive: true });
    await fs.mkdir(path.join(resourcePath, 'plans'), { recursive: true });
    
    const indexContent = {
        id: 'advanced-trad-outdoor',
        title: 'Advanced Traditional Climbing Development',
        description: 'An intensive 12-week program designed for intermediate trad climbers looking to push into advanced grades, focusing on complex protection strategies, multi-pitch efficiency, and advanced route finding.',
        tags: [
            'trad',
            'outdoor',
            'advanced',
            'technical',
            'alpine',
            'training plan'
        ],
        created_at: new Date().toISOString().split('T')[0],
        target_paths: [
            {
                nodes: [
                    'outdoor-trad-intermediate',
                    'outdoor-trad-advanced'
                ]
            }
        ],
        blocks: [
            'advanced-protection',
            'complex-anchors',
            'alpine-skills',
            'route-strategy',
            'rescue-systems'
        ],
        plans: [
            'twelve-week-advanced'
        ]
    };

    await fs.writeFile(
        path.join(resourcePath, 'index.yaml'),
        yaml.dump(indexContent)
    );

    const blocks = {
        'advanced-protection': {
            id: 'advanced-protection',
            title: 'Advanced Protection Strategies',
            description: '1. Complex Placements:\n- Horizontal placements\n- Expanding flakes\n- Offset configurations\n\n2. Mixed Protection:\n- Hybrid anchor systems\n- Micro protection\n- Natural protection\n\n3. Advanced Gear:\n- Specialized protection\n- Aid placement techniques\n- Testing methodologies\n\n4. Protection Strategy:\n- Run-out management\n- Psychological protection\n- Efficiency in placement',
            tags: ['protection', 'technical', 'advanced'],
            is_favorited: false
        },
        'complex-anchors': {
            id: 'complex-anchors',
            title: 'Complex Anchor Systems',
            description: '1. Advanced Anchors:\n- Complex equalizations\n- Limited placement options\n- Directional considerations\n\n2. Specialized Systems:\n- Alpine anchors\n- Remote belays\n- Multi-directional anchors\n\n3. Efficiency:\n- Quick construction\n- Material optimization\n- System assessment\n\n4. Problem Solving:\n- Unusual situations\n- Emergency anchors\n- System adaptation',
            tags: ['anchors', 'systems', 'technical'],
            is_favorited: false
        },
        'alpine-skills': {
            id: 'alpine-skills',
            title: 'Alpine Climbing Skills',
            description: '1. Alpine Techniques:\n- Fast and light strategy\n- Weather assessment\n- Terrain navigation\n\n2. Time Management:\n- Alpine starts\n- Efficient transitions\n- Descent planning\n\n3. Risk Assessment:\n- Objective hazards\n- Weather windows\n- Team capabilities\n\n4. Alpine Systems:\n- Glacier travel\n- Snow anchors\n- Alpine rescue',
            tags: ['alpine', 'technical', 'safety'],
            is_favorited: false
        },
        'route-strategy': {
            id: 'route-strategy',
            title: 'Advanced Route Strategy',
            description: '1. Route Finding:\n- Complex terrain\n- Alternative lines\n- Descent options\n\n2. Grade Management:\n- Style considerations\n- Mental preparation\n- Energy conservation\n\n3. Multi-pitch Strategy:\n- Pitch linking\n- Belay positions\n- Team management\n\n4. Time Planning:\n- Pace assessment\n- Retreat options\n- Bivouac planning',
            tags: ['strategy', 'planning', 'advanced'],
            is_favorited: false
        },
        'rescue-systems': {
            id: 'rescue-systems',
            title: 'Advanced Rescue Systems',
            description: '1. Self Rescue:\n- Advanced hauling\n- Complex escapes\n- Solo techniques\n\n2. Partner Rescue:\n- Lowering systems\n- Raising systems\n- Counterweight techniques\n\n3. Team Rescue:\n- Multi-person systems\n- Load transfers\n- Advanced rigging\n\n4. Emergency Response:\n- Communication systems\n- Emergency bivouac\n- External rescue interface',
            tags: ['rescue', 'safety', 'technical'],
            is_favorited: false
        }
    };

    for (const [blockId, block] of Object.entries(blocks)) {
        await fs.writeFile(
            path.join(resourcePath, 'blocks', `${blockId}.yaml`),
            yaml.dump(block)
        );
    }

    const plan = {
        id: 'twelve-week-advanced',
        title: '12-Week Advanced Trad Development',
        tags: ['trad', 'outdoor', 'advanced', 'technical'],
        is_favorited: false,
        weeks: [
            {
                week_number: 1,
                days: {
                    1: [
                        { block: 'advanced-protection', time_slot: '09:00' },
                        { block: 'complex-anchors', time_slot: '14:00' }
                    ],
                    4: [
                        { block: 'alpine-skills', time_slot: '09:00' },
                        { block: 'route-strategy', time_slot: '14:00' }
                    ],
                    6: [
                        { block: 'rescue-systems', time_slot: '09:00' }
                    ]
                }
            }
        ]
    };

    await fs.writeFile(
        path.join(resourcePath, 'plans', 'twelve-week-advanced.yaml'),
        yaml.dump(plan)
    );

    const content = `# Advanced Traditional Climbing Development

## Program Overview
This 12-week program is designed for intermediate trad climbers looking to push into advanced grades (5.12/7b+ and above), focusing on complex protection strategies, alpine skills, and advanced rescue systems.

## Key Components
- Advanced protection strategies
- Complex anchor systems
- Alpine climbing skills
- Route strategy development
- Advanced rescue systems

## Weekly Structure
- 3 intensive training sessions per week
- Field practice requirements
- Skill assessment checkpoints
- Safety protocol review

## Prerequisites
- Solid trad leading experience (5.11/7a)
- Multi-pitch experience
- Basic rescue knowledge
- Alpine exposure

## Safety Guidelines
- Always maintain redundancy
- Practice rescue skills regularly
- Monitor conditions carefully
- Maintain clear communication

Remember: Advanced traditional climbing requires comprehensive systems knowledge and excellent judgment. Safety must always be the priority.`;

    await fs.writeFile(
        path.join(resourcePath, 'content.md'),
        content
    );
}

createTrainingResource();