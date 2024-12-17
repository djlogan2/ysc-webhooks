// services/scheduler.js
import cron from 'node-cron';

function runEvery(minutes, task) {
    const cronExpression = `*/${minutes} * * * *`;
    cron.schedule(cronExpression, task);
}

export { runEvery };
