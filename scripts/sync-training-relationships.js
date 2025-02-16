import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

async function syncTrainingRelationships() {
    try {
        // First, add related_training_plans field if missing
        await addMissingTrainingPlansField();
        
        // Then sync relationships
        await syncRelationships();
        
        console.log('Training relationships synchronized successfully!');
    } catch (error) {
        console.error('Error syncing relationships:', error);
    }
}

async function addMissingTrainingPlansField() {
    const infoDir = path.join(process.cwd(), 'resources', 'information');
    const infoDirs = await fs.readdir(infoDir);

    for (const resourceId of infoDirs) {
        const indexPath = path.join(infoDir, resourceId, 'index.yaml');
        try {
            const content = await fs.readFile(indexPath, 'utf8');
            const resource = yaml.load(content);

            if (!resource.related_training_plans) {
                resource.related_training_plans = [];
                await fs.writeFile(indexPath, yaml.dump(resource));
            }
        } catch (error) {
            console.error(`Error processing ${resourceId}:`, error);
        }
    }
}

async function syncRelationships() {
    const trainingDir = path.join(process.cwd(), 'resources', 'training');
    const infoDir = path.join(process.cwd(), 'resources', 'information');

    // Get all information resources
    const infoResources = new Map();
    const infoDirs = await fs.readdir(infoDir);
    for (const resourceId of infoDirs) {
        const indexPath = path.join(infoDir, resourceId, 'index.yaml');
        const content = await fs.readFile(indexPath, 'utf8');
        infoResources.set(resourceId, yaml.load(content));
    }

    // Process each training resource
    const trainingDirs = await fs.readdir(trainingDir);
    const validConnections = new Set();

    for (const trainingId of trainingDirs) {
        const indexPath = path.join(trainingDir, trainingId, 'index.yaml');
        const content = await fs.readFile(indexPath, 'utf8');
        const trainingResource = yaml.load(content);

        // Process each target path
        if (trainingResource.target_paths) {
            for (const path of trainingResource.target_paths) {
                for (const nodeId of path.nodes) {
                    const infoResource = infoResources.get(nodeId);
                    if (infoResource) {
                        // Add training resource to info resource if not present
                        if (!infoResource.related_training_plans.includes(trainingId)) {
                            infoResource.related_training_plans.push(trainingId);
                        }
                        validConnections.add(`${nodeId}:${trainingId}`);
                    }
                }
            }
        }
    }

    // Clean up invalid connections
    for (const [resourceId, resource] of infoResources) {
        resource.related_training_plans = resource.related_training_plans.filter(
            trainingId => validConnections.has(`${resourceId}:${trainingId}`)
        );

        // Save updated information resource
        const indexPath = path.join(infoDir, resourceId, 'index.yaml');
        await fs.writeFile(indexPath, yaml.dump(resource));
    }
}

syncTrainingRelationships();