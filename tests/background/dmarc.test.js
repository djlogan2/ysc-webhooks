import emailService from '../../services/emailService';
import dmarcService from '../../services/dmarcService';
import dmarcProcessor from '../../background/dmarc';

jest.mock('../../services/emailService', () => ({
    getInbox: jest.fn(),
    getAttachmentData: jest.fn(),
    archiveEmail: jest.fn(),
    sendEmail: jest.fn()
}));

jest.mock('../../services/dmarcService', () => ({
    storeDmarcData: jest.fn(),
    markAsHandled: jest.fn()
}));

describe('DMARC Processor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should process valid DMARC reports and store data', async () => {
        const mockInbox = [
            {
                id: '1',
                subject: 'DMARC Report: example.com',
                hasAttachments: true,
                attachments: [
                    { id: 'a1', name: 'report.xml.gz', contentType: 'application/gzip' }
                ]
            }
        ];

        const mockAttachmentData = {
            contentBytes: 'mocked_gzip_content' // In reality, this would be binary content.
        };

        emailService.getInbox.mockResolvedValue(mockInbox);
        emailService.getAttachmentData.mockResolvedValue(mockAttachmentData);
        emailService.archiveEmail.mockResolvedValue(true);
        dmarcService.storeDmarcData.mockResolvedValue(true);

        await dmarcProcessor.processDmarcReports();

        expect(emailService.getInbox).toHaveBeenCalled();
        expect(emailService.getAttachmentData).toHaveBeenCalledWith('1', 'a1');
        expect(emailService.archiveEmail).toHaveBeenCalledWith('1');
        expect(dmarcService.storeDmarcData).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should send notification for actionable DMARC data', async () => {
        const mockData = [
            { id: 'record1', action_required: 1, severity: 'high', domain: 'example.com' }
        ];

        dmarcService.getActionableDmarcData = jest.fn().mockResolvedValue(mockData);
        emailService.sendEmail.mockResolvedValue(true);

        await dmarcProcessor.sendNotificationsForActionableData();

        expect(dmarcService.getActionableDmarcData).toHaveBeenCalled();
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            expect.any(String),
            'DMARC Alert: example.com',
            expect.stringContaining('high severity issues detected')
        );
    });

    it('should handle errors gracefully', async () => {
        emailService.getInbox.mockRejectedValue(new Error('Email fetch failed'));

        await expect(dmarcProcessor.processDmarcReports()).resolves.not.toThrow();

        expect(emailService.getInbox).toHaveBeenCalled();
    });
});
