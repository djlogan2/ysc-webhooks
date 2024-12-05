const calendarService = require('../services/calendarService');

exports.readCalendar = async (req, res) => {
    try {
        const calendar = await calendarService.getCalendar();
        res.json(calendar);
    } catch (error) {
        res.status(500).json({ message: 'Error reading calendar' });
    }
};

exports.createCalendar = async (req, res) => {
    try {
        const newCalendar = await calendarService.createCalendar(req.body);
        res.status(201).json(newCalendar);
    } catch (error) {
        res.status(500).json({ message: 'Error creating calendar' });
    }
};

exports.deleteCalendar = async (req, res) => {
    try {
        await calendarService.deleteCalendar(req.params.id);
        res.json({ message: 'Calendar deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting calendar' });
    }
};