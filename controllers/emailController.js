import emailService from '../services/emailService.js';

export const readEmails = async (req, res) => {
    try {
        const emails = await emailService.getInbox();
        res.json(emails);
    } catch (error) {
        res.status(500).json({message: 'Error reading emails'});
    }
};

export const sendEmail = async (req, res) => {
    try {
        const {to, subject, body} = req.body;
        await emailService.sendEmail(to, subject, body);
        res.status(201).json({message: 'Email sent successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error sending email'});
    }
};

export const deleteEmail = async (req, res) => {
    try {
        await emailService.deleteEmail(req.params.id);
        res.json({message: 'Email deleted successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error deleting email'});
    }
};

export const archiveEmail = async (req, res) => {
    try {
        await emailService.archiveEmail(req.params.id);
        res.json({message: 'Email archived successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error archiving email'});
    }
};

export const test = async (req, res) => {
    try {
        //await emailService.test(req.params.id);
        const ret = await emailService.getInbox();
        res.json({message: 'Email TEST successfully'});
    } catch (error) {
        res.status(500).json({message: 'Error TEST email'});
    }
}