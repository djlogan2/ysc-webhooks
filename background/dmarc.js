import {  parseStringPromise  } from 'xml2js.js';
import {  unzipSync  } from 'zlib.js';

import {  createTask  } from '../services/taskmanager/taskService.js'; // Assuming taskService is already set up

/**
 * Filters emails to identify DMARC reports.
 * @param {Object} email - The email object to check.
 * @returns {boolean} - Whether the email is a DMARC report.
 */
const isDmarcEmail = (email) => {
    const subjectContainsDmarc = email.subject && email.subject.toLowerCase().includes('dmarc');
    const subjectContainsReportDomain = email.subject && email.subject.toLowerCase().includes('report domain:');
    return subjectContainsDmarc || subjectContainsReportDomain;
};

/**
 * Unzips and extracts the buffer content if necessary.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {string} - The extracted file content.
 */
const unarchiveBuffer = (buffer, mimeType) => {
    if (mimeType === 'application/zip') {
        return unzipSync(buffer).toString();
    } else if (mimeType === 'application/gzip') {
        return unzipSync(buffer).toString();
    }
    return buffer.toString();
};

/**
 * Converts XML content to JSON.
 * @param {string} xml - The XML string.
 * @returns {Object} - Parsed JSON object.
 */
const xmlToJson = async (xml) => {
    try {
        return await parseStringPromise(xml);
    } catch (error) {
        console.error('Error parsing XML:', error);
        throw new Error('Invalid XML format');
    }
};

/**
 * Processes a single DMARC record.
 * @param {Object} record - The parsed DMARC record.
 */
const processDmarcRecord = async (record) => {
    const actionRequired = determineActionRequired(record); // You can define your own logic here
    const severity = determineSeverity(record); // Define severity levels as needed

    // Insert into the database
    const dmarcRecord = {
        id: generateUniqueId(),
        timestamp: new Date(),
        source_ip: record.source_ip || null,
        domain: record.domain || null,
        disposition: record.disposition || null,
        spf_result: record.spf || null,
        dkim_result: record.dkim || null,
        message_count: record.message_count || 1,
        action_required: actionRequired ? 1 : 0,
        severity,
        resolution_status: 'Open',
        aggregated_by: record.aggregated_by || null,
        reported_by: record.reported_by || null,
        policy_mode: record.policy || null,
    };

    // Create a task for actionable records
    if (actionRequired) {
        await createTask({
            task_name: `DMARC Issue: ${record.domain || 'Unknown Domain'}`,
            description: `Action needed for DMARC issue on domain ${record.domain}. Severity: ${severity}`,
            status: 'Next Action',
            priority_id: 2, // Assuming 2 is the priority for DMARC issues
        });
    }

    // Simulate database insert (replace with actual DB logic)
    console.log('Inserted DMARC record:', dmarcRecord);
};

/**
 * Processes DMARC reports from emails.
 * @param {Array} emails - List of email objects.
 */
const processDmarcReports = async (emails) => {
    for (const email of emails) {
        if (!isDmarcEmail(email)) continue;

        try {
            const attachment = email.attachment;
            const extractedContent = unarchiveBuffer(attachment.buffer, attachment.mimeType);
            const parsedJson = await xmlToJson(extractedContent);

            for (const record of parsedJson.records) {
                await processDmarcRecord(record);
            }
        } catch (error) {
            console.error(`Error processing email from ${email.from}:`, error);
        }
    }
};

// Utility function examples
const determineActionRequired = (record) => record.disposition !== 'none'; // Simplified logic
const determineSeverity = (record) => (record.disposition === 'reject' ? 'High' : 'Medium');
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

export { processDmarcReports, isDmarcEmail, unarchiveBuffer, xmlToJson };
