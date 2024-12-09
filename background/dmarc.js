// background/dmarc.js
const fflate = require('fflate');
const xml2js = require('xml2js');
const os = require('os');
const dns = require('dns').promises;
const dmarcService = require('../services/dmarcService');

const {runEvery} = require('../services/scheduler');
const {getInbox, getAttachmentData, deleteEmail} = require("../services/emailService");

function uint8ArrayToString(uint8Array) {
    return new TextDecoder('utf-8').decode(uint8Array);
}

async function xmlToJson(xmlString) {
    return new Promise((resolve, reject) => {
        return xml2js.parseString(xmlString, {mergeAttrs: true}, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function unarchiveBuffer(base64data, filename) {
    const fileExtension = filename.split('.').pop().toLowerCase();

    return new Promise((resolve, reject) => {
        try {
            if (fileExtension === 'zip') {
                const unzipped = fflate.unzipSync(Buffer.from(base64data.contentBytes, 'base64'));
                resolve(unzipped);
            } else if (fileExtension === 'gz') {
                const decompressed = fflate.gunzipSync(Buffer.from(base64data.contentBytes, 'base64'));
                resolve({[filename.slice(0, -3)]: decompressed});
            } else {
                reject(new Error('Unsupported file format'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

function isdmarc(email) {
    return email.from.emailAddress.name.toLowerCase().includes('dmarc') ||
        email.from.emailAddress.address.toLowerCase().includes('dmarc') ||
        email.subject.toLowerCase().includes('dmarc') ||
        email.subject.toLowerCase().includes('report domain:');
}

function runBackgroundDMARC() {
    let running = false;
    runEvery(parseInt(process.env.DMARC_MINUTES || "30"), async () => {
        if (running) return;
        running = true;
        try {
            const emails = await getInbox();
            const filteredemails = emails.filter(isdmarc);

            for (const email of filteredemails) {
                let index = 0;
                if (!!email.attachments && !!email.attachments.length) {
                    try {
                        const filename = email.attachments[0].name;
                        const base64data = await getAttachmentData(email.id, email.attachments[0].id);
                        const fileobject = await unarchiveBuffer(base64data, filename);
                        const xmlString = uint8ArrayToString(Object.values(fileobject)[0]);
                        const jsonObj = await xmlToJson(xmlString);
                        for (let index = 0; index < jsonObj.feedback.record.length; index++) {
                            try {
                                const dmarcrecord = {
                                    id: `${jsonObj.feedback.report_metadata[0].report_id[0]}-${index}`,
                                    timestamp: new Date(jsonObj.feedback.report_metadata[0].date_range[0].begin[0] * 1000),
                                    source_ip: jsonObj.feedback.record[index].row[0].source_ip[0],
                                    domain: jsonObj.feedback.record[index].identifiers[0].header_from[0],
                                    disposition: jsonObj.feedback.record[index].row[0].policy_evaluated?.[0]?.disposition?.[0],
                                    spf_result: jsonObj.feedback.record[index].auth_results[0].spf.reduce((pf, obj) => obj.result === 'fail' ? 'fail' : pf, 'pass'),
                                    dkim_result: jsonObj.feedback.record[index].auth_results[0].dkim.reduce((pf, obj) => obj.result === 'fail' ? 'fail' : pf, 'pass'),
                                    message_count: jsonObj.feedback.record[index].row[0].count[0],
                                    reported_by: jsonObj.feedback.report_metadata[0].org_name[0],
                                    policy_mode: jsonObj.feedback.policy_published[0].p[0]
                                }
                                if (!dmarcrecord.disposition)
                                    dmarcrecord.disposition = dmarcrecord.dkim_result === 'pass' && dmarcrecord.spf_result === 'pass' ? 'pass' : 'fail';
                                if (dmarcrecord.disposition === 'rejected' || dmarcrecord.disposition === 'quarantine' || (dmarcrecord.dkim_result === 'fail' && dmarcrecord.spf_result === 'fail'))
                                    dmarcrecord.severity = 'High';
                                else if (dmarcrecord.dkim_result === 'fail' || dmarcrecord.spf_result === 'fail' || dmarcrecord.disposition === 'none')
                                    dmarcrecord.severity = 'Medium';
                                else
                                    dmarcrecord.severity = 'Low';
                                dmarcrecord.action_required = dmarcrecord.severity === 'High' || dmarcrecord.message_count > 1000;
                                await dmarcService.writeDMARCRecord(dmarcrecord);
                            } catch (error) {
                                console.log(error);
                            }
                        }
                        await deleteEmail(email.id);
                    } catch (error) {
                        console.log(`Error processing email ${email.subject} : ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
        await processDMARCRecords();
        running = false;
    });
}

// Function to resolve IPs for mail server hostnames
async function resolveMailServerIPs(hostnames) {
    const resolvedIPs = new Set();

    for (const hostname of hostnames) {
        try {
            const addresses = await dns.resolve(hostname, 'A'); // Get IPv4 addresses
            addresses.forEach(ip => resolvedIPs.add(ip));
        } catch (error) {
            console.error(`Failed to resolve IPs for ${hostname}:`, error.message);
        }
    }

    return Array.from(resolvedIPs);
}

async function processDMARCRecords() {
    try {
        const hostname = os.hostname();
        console.log(`Processing DMARC records on host: ${hostname}`);

        // Fetch records that need attention
        const records = await dmarcService.getNeedsAttention();

        if (records.length === 0) {
            console.log('No records require attention at this time.');
            return;
        }

        // Get the current set of approved IPs dynamically from DNS lookups
        const approvedHostnames = ['smtp.office365.com', 'outlook.office365.com']; // Replace with your exact hostnames
        const approvedIPs = (await Promise.all(
            approvedHostnames.map(async (hostname) => {
                try {
                    const addresses = await dns.resolve(hostname);
                    return addresses;
                } catch (err) {
                    console.error(`Failed to resolve ${hostname}:`, err);
                    return [];
                }
            })
        )).flat();

        console.log('Approved IPs:', approvedIPs);

        // Aggregation variables
        const manualReviewApprovedIPs = [];
        const manualReviewUnapprovedIPs = new Set();
        const potentialSpoofingIPs = new Set();
        const recipientNotifications = new Map();

        // Process each record
        for (const record of records) {
            const sourceIP = record.source_ip; // Assuming record includes source_ip field
            const isApprovedIP = approvedIPs.includes(sourceIP);

            if (isApprovedIP) {
                // Collect manual review actions for approved IPs
                if (!manualReviewApprovedIPs.includes(sourceIP)) {
                    manualReviewApprovedIPs.push(sourceIP);
                }
            } else {
                // If flagged for potential spoofing for your domain, prioritize as spoofing
                if (record.domain === 'yoursoftwarecto.com') {
                    potentialSpoofingIPs.add(sourceIP);
                } else {
                    // Otherwise, add to the general unapproved IPs review
                    manualReviewUnapprovedIPs.add(sourceIP);

                    // Aggregate recipient notifications
                    if (!recipientNotifications.has(record.domain)) {
                        recipientNotifications.set(record.domain, new Set());
                    }
                    recipientNotifications.get(record.domain).add(sourceIP);
                }
            }

            // // Mark record as handled
            // const success = await dmarcService.markAsHandled(record.id);
            // if (success) {
            //     console.log(`Record ID ${record.id} marked as handled.`);
            // } else {
            //     console.error(`Failed to mark record ID ${record.id} as handled.`);
            // }
        }

        // Output aggregated actions
        if (manualReviewApprovedIPs.length > 0) {
            console.warn(
                `Manual Action: Verify email headers and check for anomalies for the following approved IPs: ${manualReviewApprovedIPs.join(
                    ', '
                )}. Ensure no unauthorized use or unusual patterns.`
            );
        }

        if (manualReviewUnapprovedIPs.size > 0) {
            console.warn(
                `Manual Action: Review the following unapproved IPs for potential abuse or misconfiguration: ${[
                    ...manualReviewUnapprovedIPs,
                ].join(', ')}.`
            );
        }

        if (potentialSpoofingIPs.size > 0) {
            console.warn(
                `ALERT: Potential spoofing detected for your domain from the following IPs: ${[
                    ...potentialSpoofingIPs,
                ].join(', ')}.`
            );
            console.log(`Action: Contact your email provider and report the suspicious activity.`);
        }

        if (recipientNotifications.size > 0) {
            console.log('Manual Action: Notify the following recipients to be cautious of emails from the listed IPs:');
            for (const [domain, ips] of recipientNotifications.entries()) {
                console.log(`- ${domain}: ${[...ips].join(', ')}`);
            }
        }

        console.log('DMARC processing completed.');
    } catch (error) {
        console.error('Error during DMARC processing:', error);
    }
}

module.exports = {runBackgroundDMARC};