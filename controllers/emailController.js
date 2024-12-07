const emailService = require('../services/emailService');

exports.readEmails = async (req, res) => {
    try {
        const emails = await emailService.getInbox();
        res.json(emails);
    } catch (error) {
        res.status(500).json({message: 'Error reading emails'});
    }
};

exports.sendEmail = async (req, res) => {
    try {
        const {to, subject, body} = req.body;
        await emailService.sendEmail(to, subject, body);
        res.status(201).json({message: 'Email sent successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error sending email'});
    }
};

exports.deleteEmail = async (req, res) => {
    try {
        await emailService.deleteEmail(req.params.id);
        res.json({message: 'Email deleted successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error deleting email'});
    }
};

exports.archiveEmail = async (req, res) => {
    try {
        await emailService.archiveEmail(req.params.id);
        res.json({message: 'Email archived successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error archiving email'});
    }
};

exports.test = async (req, res) => {
    try {
        //await emailService.test(req.params.id);
        const ret = await emailService.getInbox();
        res.json({message: 'Email TEST successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error TEST email'});
    }
}