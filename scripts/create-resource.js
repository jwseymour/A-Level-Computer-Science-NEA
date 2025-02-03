import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./src/db/users.db');

// Resource content in MDX format
const resourceContent = `
# 6-Week Sport Climbing Endurance Program

## Overview
This program focuses on building climbing endurance for sport routes, targeting climbers who want to improve their stamina on longer routes.

## Program Goals
- Increase forearm endurance
- Improve recovery between clips
- Build aerobic capacity
- Develop mental stamina
- Perfect rest positions

## Weekly Structure
- 3 climbing sessions
- 2 cardio/antagonist sessions
- 2 rest days

## Training Methods
1. ARC Training (Aerobic Restoration and Capillarity)
   - 20-30 minute continuous climbing
   - Focus on efficient movement
   - Stay below pump threshold

2. Interval Training
   - 4x4 minute on-wall intervals
   - 1:1 work/rest ratio
   - Progressive difficulty increase

3. Pyramid Sessions
   - Start easy, build up, then down
   - Example: 5.9, 5.10a, 5.10c, 5.11a, 5.10c, 5.10a, 5.9
   - Focus on perfect form

## Recovery Strategies
- Light stretching
- Proper hydration
- Protein timing
- Sleep optimization

## Progress Markers
- Route grades at flash level
- Time spent on continuous climbing
- Recovery speed between burns
- Number of routes per session
`;

const resource = {
    title: "Sport Climbing Endurance Builder",
    description: "A 6-week program designed to improve climbing endurance and stamina for sport routes.",
    content: resourceContent,
    tags: "sport climbing,endurance,stamina,training plan,ARC"
};

const blocks = [
    {
        title: "ARC Training Session",
        description: "Low-intensity, long-duration climbing for capillarity development",
        tags: "endurance,ARC,technique",
        is_favorited: 0
    },
    {
        title: "Interval Power Endurance",
        description: "4x4 minute climbing intervals with structured rest",
        tags: "intervals,power endurance,structured",
        is_favorited: 0
    },
    {
        title: "Route Pyramid Session",
        description: "Progressive grade pyramid for endurance building",
        tags: "pyramid,endurance,progression",
        is_favorited: 0
    },
    {
        title: "Recovery Protocol",
        description: "Active recovery and mobility work",
        tags: "recovery,mobility,maintenance",
        is_favorited: 0
    }
];

const plan = {
    title: "6-Week Endurance Program",
    tags: "endurance,sport climbing,structured",
    is_favorited: 0,
    weeks: [
        {
            week_number: 1,
            days: {
                1: [{ 
                    id: null,
                    title: "ARC Training Session",
                    time_slot: "18:00" 
                }],
                3: [{ 
                    id: null,
                    title: "Interval Power Endurance",
                    time_slot: "18:00" 
                }],
                5: [{ 
                    id: null,
                    title: "Route Pyramid Session",
                    time_slot: "18:00" 
                }]
            }
        },
        {
            week_number: 2,
            days: {
                2: [{ 
                    id: null,
                    title: "ARC Training Session",
                    time_slot: "18:00" 
                }],
                4: [{ 
                    id: null,
                    title: "Interval Power Endurance",
                    time_slot: "18:00" 
                }],
                6: [{ 
                    id: null,
                    title: "Recovery Protocol",
                    time_slot: "10:00" 
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