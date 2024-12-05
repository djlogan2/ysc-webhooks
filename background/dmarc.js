// background/dmarc.js
const fflate = require('fflate');
const xml2js = require('xml2js');
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
        email.subject.toLowerCase().includes('dmarc');
}

function runBackgroundDMARC() {
    let running = false;
    runEvery(1, async () => {
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
        running = false;
    });
}

module.exports = {runBackgroundDMARC};