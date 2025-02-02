import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./src/db/users.db');

// Get resource ID from command line argument
const resourceId = process.argv[2];

if (!resourceId) {
    console.error('Please provide a resource ID');
    process.exit(1);
}

db.serialize(() => {
    // Start a transaction
    db.run('BEGIN TRANSACTION');

    // Get all plans associated with this resource
    db.all(
        `SELECT plan_id FROM resource_plans WHERE resource_id = ?`,
        [resourceId],
        (err, plans) => {
            if (err) {
                console.error('Error finding associated plans:', err);
                db.run('ROLLBACK');
                db.close();
                return;
            }

            const planIds = plans.map(p => p.plan_id);

            if (planIds.length > 0) {
                // Delete all daily blocks for these plans' weeks
                db.run(
                    `DELETE FROM daily_blocks 
                     WHERE week_id IN (
                         SELECT id FROM plan_weeks WHERE plan_id IN (${planIds.join(',')})
                     )`
                );

                // Delete all weeks for these plans
                db.run(
                    `DELETE FROM plan_weeks WHERE plan_id IN (${planIds.join(',')})`
                );

                // Delete the plans themselves
                db.run(
                    `DELETE FROM training_plans WHERE id IN (${planIds.join(',')})`
                );
            }

            // Delete resource_blocks entries
            db.run(
                'DELETE FROM resource_blocks WHERE resource_id = ?',
                [resourceId],
                (err) => {
                    if (err) {
                        console.error('Error deleting resource blocks:', err);
                        db.run('ROLLBACK');
                        db.close();
                        return;
                    }

                    // Delete resource_plans entries
                    db.run(
                        'DELETE FROM resource_plans WHERE resource_id = ?',
                        [resourceId],
                        (err) => {
                            if (err) {
                                console.error('Error deleting resource plans:', err);
                                db.run('ROLLBACK');
                                db.close();
                                return;
                            }

                            // Finally delete the resource itself
                            db.run(
                                'DELETE FROM resources WHERE id = ?',
                                [resourceId],
                                function(err) {
                                    if (err) {
                                        console.error('Error deleting resource:', err);
                                        db.run('ROLLBACK');
                                    } else {
                                        if (this.changes === 0) {
                                            console.log(`No resource found with ID ${resourceId}`);
                                            db.run('ROLLBACK');
                                        } else {
                                            db.run('COMMIT');
                                            console.log(`Successfully deleted resource ${resourceId} and all related data`);
                                        }
                                    }
                                    db.close();
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});