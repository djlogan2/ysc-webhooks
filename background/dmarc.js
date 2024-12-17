// background/dmarc.js
import * as fflate from 'fflate';
import xml2js from 'xml2js';
import dns from 'dns';
import * as dmarcService from "../services/dmarcService.js";
import {runEvery} from "../services/scheduler.js";
import {deleteEmail, getAttachmentData, getInbox, sendEmail} from "../services/emailService.js";

// const fflate = require('fflate');
// const xml2js = require('xml2js');
// const os = require('os');
// const dns = require('dns').promises;
// const dmarcService = require('../services/dmarcService');

// const {runEvery} = require('../services/scheduler');
// const {getInbox, getAttachmentData, deleteEmail, sendEmail} = require("../services/emailService");

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
    if(email.from.emailAddress.address === 'david@yoursoftwarecto.com')
        return false;
    return email.from.emailAddress.name.toLowerCase().includes('dmarc') ||
        email.from.emailAddress.address.toLowerCase().includes('dmarc') ||
        email.subject.toLowerCase().includes('dmarc') ||
        email.subject.toLowerCase().includes('report domain:');
}

export const runBackgroundDMARC = () => {
    let running = false;
    runEvery(parseInt(process.env.DMARC_MINUTES || "30"), async () => {
        if (running) return;
        running = true;
        try {
            const emails = await getInbox();
            const filteredemails = emails.filter(isdmarc);

            for (const email of filteredemails) {
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

async function processDMARCRecords() {
    try {
        // Fetch records that need attention
        const records = await dmarcService.getNeedsAttention();

        if (records.length === 0) {
            return;
        }

        // Get the current set of approved IPs dynamically from DNS lookups
        const approvedHostnames = ['smtp.office365.com', 'outlook.office365.com']; // Replace with your exact hostnames
        const approvedIPs = (await Promise.all(
            approvedHostnames.map(async (hostname) => {
                try {
                    return await dns.resolve(hostname);
                } catch (err) {
                    console.error(`Failed to resolve ${hostname}:`, err);
                    return [];
                }
            })
        )).flat();

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

            // Mark record as handled
            const success = await dmarcService.markAsHandled(record.id);
            if (!success) {
                console.error(`Failed to mark record ID ${record.id} as handled.`);
            }
        }

        // Output aggregated actions
        let body = '';
        if (manualReviewApprovedIPs.length > 0) {
            body +=
                `<p>Manual Action: Verify email headers and check for anomalies for the following approved IPs: ${manualReviewApprovedIPs.join(
                    ', '
                )}. Ensure no unauthorized use or unusual patterns.</p>`;
        }

        if (manualReviewUnapprovedIPs.size > 0) {
            body +=
                `<p>Manual Action: Review the following unapproved IPs for potential abuse or misconfiguration: ${[
                    ...manualReviewUnapprovedIPs,
                ].join(', ')}.</p>`;
        }

        if (potentialSpoofingIPs.size > 0) {
            body +=
                `<p>ALERT: Potential spoofing detected for your domain from the following IPs: ${[
                    ...potentialSpoofingIPs,
                ].join(', ')}.</p>`;
            body += `<p>Action: Contact your email provider and report the suspicious activity.</p>`;
        }

        if (recipientNotifications.size > 0) {
            body += '<p>Manual Action: Notify the following recipients to be cautious of emails from the listed IPs:';
            for (const [domain, ips] of recipientNotifications.entries()) {
                body += `- ${domain}: ${[...ips].join(', ')}`;
            }
            body += `</p>`;
        }

        if(body.length) {
            await sendEmail('david@yoursoftwarecto.com', 'DMARC actions', '<html>' + body + '</html>');
        }
    } catch (error) {
        console.error('Error during DMARC processing:', error);
    }
}
