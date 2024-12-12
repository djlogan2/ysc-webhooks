// services/scheduler.js
import cron from 'node-cron.js';

function runEvery(minutes, task) {
    const cronExpression = `*/${minutes} * * * *`;
    cron.schedule(cronExpression, task);
}

export { runEvery };