import {  Client  } from '@microsoft/microsoft-graph-client';
import emailConfig from '../config/emailConfig.js';

// Initialize the Graph client
function getAuthenticatedClient(accessToken) {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });
}

// Get access token
async function getAccessToken() {
    const url = `https://login.microsoftonline.com/${emailConfig.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: emailConfig.clientId,
        client_secret: emailConfig.clientSecret,
        scope: 'https://graph.microsoft.com/.default'
    });

    const response = await fetch(url, {
        method: 'POST',
        body: params
    });

    const data = await response.json();
    return data.access_token;
}

// Get inbox messages
async function getInbox() {
    try {
        const accessToken = await getAccessToken();
        const client = getAuthenticatedClient(accessToken);
        const result = await client
            .api(`/users/${emailConfig.emailAddress}/mailFolders/inbox/messages`)
            .top(5000)
            .select('id,subject,from,receivedDateTime,body,hasAttachments')
            .expand('attachments($select=id,name,size,contentType)')
            // .orderby('receivedDateTime DESC')
            .get();
        return result.value;
    } catch (error) {
        console.error('Error getting inbox:', error);
        throw error;
    }
}

// Delete an email
async function deleteEmail(id) {
    try {
        const accessToken = await getAccessToken();
        const client = getAuthenticatedClient(accessToken);
        await client
            .api(`/users/${emailConfig.emailAddress}/messages/${id}`)
            .delete();
        return true;
    } catch (error) {
        console.error('Error deleting email:', error);
        throw error;
    }
}

// Archive an email (move to archive folder)
async function archiveEmail(id) {
    try {
        const accessToken = await getAccessToken();
        const client = getAuthenticatedClient(accessToken);
        await client
            .api(`/users/${emailConfig.emailAddress}/messages/${id}/move`)
            .post({
                destinationId: 'archive'
            });
        return true;
    } catch (error) {
        console.error('Error archiving email:', error);
        throw error;
    }
}

// Send an email
async function sendEmail(to, subject, htmlBody) {
    try {
        const accessToken = await getAccessToken();
        const client = getAuthenticatedClient(accessToken);
        const sendMail = {
            message: {
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: htmlBody
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to
                        }
                    }
                ]
            }
        };
        await client
            .api(`/users/${emailConfig.emailAddress}/sendMail`)
            .post(sendMail);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

async function getAttachmentData(messageId, attachmentId) {
    try {
        const accessToken = await getAccessToken();
        const client = getAuthenticatedClient(accessToken);
        const test = await client
            .api(`/users/${emailConfig.emailAddress}/messages/${messageId}/attachments/${attachmentId}`)
            .get();
        return test;
    } catch (error) {
        console.error('Error getting attachment data:', error);
        throw error;
    }
}

export { getInbox, deleteEmail, archiveEmail, sendEmail, getAttachmentData };