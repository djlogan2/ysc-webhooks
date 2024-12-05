// services/scheduler.js
const cron = require('node-cron');

function runEvery(minutes, task) {
    const cronExpression = `*/${minutes} * * * *`;
    cron.schedule(cronExpression, task);
}

module.exports = { runEvery };