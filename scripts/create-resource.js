import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./src/db/users.db');

// Resource content in MDX format
const resourceContent = `
# Beginner to Intermediate Bouldering Progression

## Overview
This 8-week program is designed to take climbers from V2-V3 to V4-V5 through structured training.

## Program Goals
- Develop base finger strength safely
- Build climbing-specific core strength
- Improve movement efficiency
- Increase power endurance
- Learn proper warm-up routines

## Weekly Structure
Each week includes:
- 3 climbing sessions
- 2 supplementary training sessions
- 2 rest days

## Key Focus Areas
1. Technique Development
   - Silent feet drills
   - Precise foot placement
   - Body positioning
   - Dynamic movement control

2. Strength Building
   - Progressive hangboard training
   - Core conditioning
   - Pull strength development

3. Power Endurance
   - 4x4 boulder circuits
   - Linked boulder problems
   - Rest management

## Recovery Protocol
- Active recovery exercises
- Proper nutrition timing
- Sleep optimization
- Mobility work

## Progress Tracking
Track these metrics weekly:
- Max boulder grade
- Number of problems at each grade
- Hangboard max hang times
- Core exercise progression
`;

// Resource data
const resource = {
    title: "8-Week Bouldering Progression Plan",
    description: "A structured training program to progress from V2-V3 to V4-V5 through systematic training and technique development.",
    content: resourceContent,
    tags: "bouldering,progression,beginner,intermediate,training plan"
};

// Training blocks data
const blocks = [
    {
        title: "Technique Fundamentals",
        description: "Focus on silent feet, precise movements, and body positioning",
        tags: "technique,fundamentals,movement",
        is_favorited: 0
    },
    {
        title: "Beginner Hangboard",
        description: "Introduction to hangboard training with focus on proper form and safety",
        tags: "strength,hangboard,beginner",
        is_favorited: 0
    },
    {
        title: "4x4 Boulder Circuit",
        description: "Power endurance training through linked boulder problems",
        tags: "endurance,power,circuit",
        is_favorited: 0
    },
    {
        title: "Core Foundation",
        description: "Essential core exercises for climbing stability",
        tags: "core,strength,foundation",
        is_favorited: 0
    }
];

// Training plan data with proper block references
const plan = {
    title: "8-Week Climbing Progression",
    tags: "bouldering,progression,structured",
    is_favorited: 0,
    weeks: [
        {
            week_number: 1,
            days: {
                1: [{ 
                    id: null,
                    title: "Technique Fundamentals",
                    time_slot: "09:00" 
                }],
                3: [{ 
                    id: null,
                    title: "Core Foundation",
                    time_slot: "09:00" 
                }],
                5: [{ 
                    id: null,
                    title: "Beginner Hangboard",
                    time_slot: "09:00" 
                }]
            }
        },
        {
            week_number: 2,
            days: {
                2: [{ 
                    id: null,
                    title: "4x4 Boulder Circuit",
                    time_slot: "09:00" 
                }],
                4: [{ 
                    id: null,
                    title: "Technique Fundamentals",
                    time_slot: "09:00" 
                }],
                6: [{ 
                    id: null,
                    title: "Core Foundation",
                    time_slot: "09:00" 
                }]
            }
        }
    ]
};

// Modified database insertion code
db.serialize(() => {
    // First create resource and blocks as before...
    db.run(
        'INSERT INTO resources (title, description, content, tags) VALUES (?, ?, ?, ?)',
        [resource.title, resource.description, resource.content, resource.tags],
        function(err) {
            if (err) {
                console.error('Error creating resource:', err);
                return;
            }
            const resourceId = this.lastID;
            console.log('Resource created with ID:', resourceId);

            // Create blocks and store their IDs
            const blockPromises = blocks.map(block => {
                return new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO training_blocks (title, description, tags, is_favorited) VALUES (?, ?, ?, ?)',
                        [block.title, block.description, block.tags, block.is_favorited],
                        function(err) {
                            if (err) reject(err);
                            const blockId = this.lastID;
                            
                            // Link block to resource
                            db.run(
                                'INSERT INTO resource_blocks (resource_id, block_id) VALUES (?, ?)',
                                [resourceId, blockId]
                            );
                            
                            resolve({ title: block.title, id: blockId });
                        }
                    );
                });
            });

            // After blocks are created, create the plan
            Promise.all(blockPromises).then(createdBlocks => {
                // Create training plan
                db.run(
                    'INSERT INTO training_plans (title, tags, is_favorited) VALUES (?, ?, ?)',
                    [plan.title, plan.tags, plan.is_favorited],
                    function(err) {
                        if (err) {
                            console.error('Error creating plan:', err);
                            return;
                        }
                        const planId = this.lastID;

                        // Link plan to resource
                        db.run(
                            'INSERT INTO resource_plans (resource_id, plan_id) VALUES (?, ?)',
                            [resourceId, planId]
                        );

                        // Create weeks and add blocks to days
                        plan.weeks.forEach(week => {
                            db.run(
                                'INSERT INTO plan_weeks (plan_id, week_number) VALUES (?, ?)',
                                [planId, week.week_number],
                                function(err) {
                                    if (err) {
                                        console.error('Error creating week:', err);
                                        return;
                                    }
                                    const weekId = this.lastID;

                                    // Add blocks to days
                                    Object.entries(week.days).forEach(([day, dayBlocks]) => {
                                        dayBlocks.forEach(blockData => {
                                            const block = createdBlocks.find(b => b.title === blockData.title);
                                            if (block) {
                                                db.run(
                                                    'INSERT INTO daily_blocks (week_id, day_of_week, block_id, time_slot) VALUES (?, ?, ?, ?)',
                                                    [weekId, day, block.id, blockData.time_slot]
                                                );
                                            }
                                        });
                                    });
                                }
                            );
                        });
                    }
                );
            });

            // Close database connection after all operations are complete
            setTimeout(() => db.close(), 2000);
        }
    );
});

// import sqlite3 from 'sqlite3';

// // Connect to database
// const db = new sqlite3.Database('./src/db/users.db');

// // Resource content in MDX format
// const resourceContent = `
// # Complete Climbing Training Guide

// ## Introduction
// This comprehensive guide covers essential training principles for rock climbing, focusing on developing strength, technique, and mental resilience. Whether you're a beginner or an advanced climber, these principles will help you progress systematically.

// ## Key Training Areas

// ### 1. Finger Strength
// Finger strength is crucial for climbing success. However, it's important to progress gradually to prevent injury.

// #### Training Methods:
// - Hangboard protocols
//   * Beginner: 7/3 repeaters on large edges
//   * Intermediate: Max hangs on smaller edges
//   * Advanced: One-arm hangs and minimal edge training
// - Campus board basics
// - No-hang device training

// ### 2. Core Stability
// A strong core is essential for maintaining body tension on overhanging routes.

// #### Key Exercises:
// - Front levers (progressions)
// - Dragon flags
// - Ab wheel rollouts
// - Hanging leg raises
// - Plank variations

// ### 3. Pull Strength
// While climbing itself builds pulling strength, supplementary training can accelerate progress.

// #### Exercises:
// - Pull-ups (weighted when possible)
// - Lock-offs at various angles
// - Typewriters
// - Assisted one-arm training

// ### 4. Movement Technique
// Technique is often more important than pure strength.

// #### Focus Areas:
// - Silent feet drills
// - Hip positioning
// - Flag positions
// - Dynamic movement
// - Rest positions

// ### 5. Mental Training
// The mental aspect of climbing is crucial for performing at your limit.

// #### Key Aspects:
// - Visualization techniques
// - Breathing exercises
// - Fear management
// - Route reading skills
// - Performance preparation

// ## Training Schedule
// - 3-4 climbing sessions per week
// - 2-3 supplementary training sessions
// - 1-2 complete rest days
// - Alternate between power and endurance focus

// ## Recovery Tips
// 1. Get adequate sleep (8+ hours)
// 2. Stay hydrated
// 3. Focus on nutrition
// 4. Use active recovery techniques
// 5. Listen to your body

// ## Progress Tracking
// - Keep a training log
// - Document max grades
// - Track hangboard numbers
// - Film yourself climbing
// - Review and adjust every 6-8 weeks
// `;

// // Resource data
// const resource = {
//     title: "Complete Climbing Training Guide",
//     description: "A comprehensive guide to climbing training, covering strength, technique, mental training, and structured progression plans.",
//     content: resourceContent,
//     tags: "climbing,training,strength,technique,mental training,fingerboard,core training"
// };

// // Training blocks data
// const blocks = [
//     {
//         title: "Fingerboard Strength Protocol",
//         description: "Progressive hangboard training for systematic finger strength development",
//         tags: "fingerboard,strength,hangboard",
//         is_favorited: 0
//     },
//     {
//         title: "Core Power Circuit",
//         description: "Intensive core workout focusing on climbing-specific movements",
//         tags: "core,strength,power",
//         is_favorited: 0
//     },
//     {
//         title: "Movement Skills Session",
//         description: "Technique drills focusing on precise footwork and body positioning",
//         tags: "technique,skills,movement",
//         is_favorited: 0
//     },
//     {
//         title: "Mental Training Workshop",
//         description: "Exercises for developing mental resilience and focus while climbing",
//         tags: "mental,focus,visualization",
//         is_favorited: 0
//     }
// ];

// // Insert the resource and blocks
// db.serialize(() => {
//     // Insert resource
//     db.run(
//         'INSERT INTO resources (title, description, content, tags) VALUES (?, ?, ?, ?)',
//         [resource.title, resource.description, resource.content, resource.tags],
//         function(err) {
//             if (err) {
//                 console.error('Error creating resource:', err);
//                 return;
//             }
//             const resourceId = this.lastID;
//             console.log('Resource created with ID:', resourceId);

//             // Insert all training blocks
//             blocks.forEach(block => {
//                 db.run(
//                     'INSERT INTO training_blocks (title, description, tags, is_favorited) VALUES (?, ?, ?, ?)',
//                     [block.title, block.description, block.tags, block.is_favorited],
//                     function(err) {
//                         if (err) {
//                             console.error('Error creating block:', err);
//                             return;
//                         }
//                         const blockId = this.lastID;
//                         console.log(`Block "${block.title}" created with ID:`, blockId);

//                         // Link block to resource
//                         db.run(
//                             'INSERT INTO resource_blocks (resource_id, block_id) VALUES (?, ?)',
//                             [resourceId, blockId],
//                             function(err) {
//                                 if (err) {
//                                     console.error('Error linking block to resource:', err);
//                                     return;
//                                 }
//                                 console.log(`Block ${blockId} linked to resource ${resourceId}`);
//                             }
//                         );
//                     }
//                 );
//             });

//             // Close database connection after all operations are complete
//             setTimeout(() => db.close(), 1000);
//         }
//     );
// });