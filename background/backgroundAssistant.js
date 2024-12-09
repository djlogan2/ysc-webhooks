// const taskService = require('../services/taskService');
// const notificationService = require('../services/notificationService');
const calendarService = require('../services/calendarService');
const {runEvery} = require("../services/scheduler");

async function runBackgroundAssistant() {
    runEvery(parseInt(process.env.ASSISTANT_MINUTES || "30"), async () => {
        try {
            // 1. Check for overdue tasks
            const overdueTasks = await taskService.getOverdueTasks();
            overdueTasks.forEach(task => {
                notificationService.notify(`Overdue Task: ${task.task_name}`);
            });

            // 2. Check upcoming tasks based on the calendar
            const todaySchedule = await calendarService.getTodaySchedule();
            const availableSlots = todaySchedule.filter(slot => slot.isAvailable);

            if (availableSlots.length) {
                const nextTasks = await taskService.getNextTasks();
                nextTasks.forEach(task => {
                    const message = `You have time at ${availableSlots[0].startTime}. Consider: ${task.task_name}`;
                    notificationService.notify(message);
                });
            }

            // 3. General nagging logic for uncompleted items
            const naggingTasks = await taskService.getNaggingTasks();
            naggingTasks.forEach(task => {
                notificationService.notify(`Reminder: ${task.task_name}`);
            });
        } catch (error) {
            console.error('Error running background assistant:', error);
        }
    });
}


module.exports = { runBackgroundAssistant };
