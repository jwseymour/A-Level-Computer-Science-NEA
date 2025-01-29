const DB_NAME = 'fitnessTracker';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create training plans store
            if (!db.objectStoreNames.contains('trainingPlans')) {
                const store = db.createObjectStore('trainingPlans', { keyPath: 'id', autoIncrement: true });
                store.createIndex('userId', 'userId', { unique: false });
                store.createIndex('name', 'name', { unique: false });
            }
        };
    });
}

async function saveTrainingPlan(plan) {
    const db = await openDB();
    const tx = db.transaction('trainingPlans', 'readwrite');
    const store = tx.objectStore('trainingPlans');
    
    const user = JSON.parse(localStorage.getItem('user'));
    plan.userId = user.id;

    return new Promise((resolve, reject) => {
        const request = plan.id ? store.put(plan) : store.add(plan);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getTrainingPlans() {
    const db = await openDB();
    const tx = db.transaction('trainingPlans', 'readonly');
    const store = tx.objectStore('trainingPlans');
    const userIndex = store.index('userId');
    
    const user = JSON.parse(localStorage.getItem('user'));

    return new Promise((resolve, reject) => {
        const request = userIndex.getAll(IDBKeyRange.only(user.id));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteTrainingPlan(id) {
    const db = await openDB();
    const tx = db.transaction('trainingPlans', 'readwrite');
    const store = tx.objectStore('trainingPlans');

    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export { openDB, saveTrainingPlan, getTrainingPlans, deleteTrainingPlan };