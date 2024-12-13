import later from 'later';
import { DateTime } from 'luxon';

export class CustomLater {
    /**
     * @param {string} timezone - The timezone to be used for all operations (e.g., 'America/Denver').
     */
    constructor(timezone) {
        if (!timezone) {
            throw new Error('Timezone is required for CustomLater.');
        }
        this.timezone = timezone;
    }

    /**
     * Parses a text-based recurring interval expression into a Later.js schedule object.
     * @param {string} recurringInterval - The text-based recurring interval (e.g., 'every Monday').
     * @returns {Object} - A parsed Later.js schedule object.
     */
    parseText(recurringInterval) {
        const schedule = later.parse.text(recurringInterval);
        if (schedule.error !== -1) {
            throw new Error(`Invalid recurring_interval: ${recurringInterval}`);
        }
        return schedule;
    }

    /**
     * Validates if a given UTC date aligns with a recurring interval schedule.
     * @param {Object} schedule - A Later.js schedule object.
     * @param {Date} utcDate - The UTC date to validate.
     * @returns {boolean} - True if the date aligns, false otherwise.
     */
    isValid(schedule, utcDate) {
        const zonedDate = DateTime.fromJSDate(utcDate, { zone: this.timezone }).toJSDate();
        return later.schedule(schedule).isValid(zonedDate);
    }

    /**
     * Gets the next occurrences of the schedule starting from a given UTC date.
     * @param {Object} schedule - A Later.js schedule object.
     * @param {number} count - The number of occurrences to fetch.
     * @param {Date} utcDate - The starting UTC date.
     * @returns {Array} - An array of the next `count` occurrences in UTC.
     */
    next(schedule, count, utcDate) {
        const zonedDate = DateTime.fromJSDate(utcDate, { zone: this.timezone }).toJSDate();
        const nextDates = later.schedule(schedule).next(count, zonedDate);
        return nextDates.map((date) =>
            DateTime.fromJSDate(date, { zone: this.timezone }).toUTC().toJSDate()
        );
    }

    /**
     * Gets the first occurrence of the schedule starting from a given UTC date.
     * @param {Object} schedule - A Later.js schedule object.
     * @param {Date} utcDate - The starting UTC date.
     * @returns {Date|null} - The next occurrence in UTC, or null if none.
     */
    nextOne(schedule, utcDate) {
        const nextDates = this.next(schedule, 1, utcDate);
        return nextDates.length > 0 ? nextDates[0] : null;
    }
}
