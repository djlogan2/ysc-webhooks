module.exports = {
    auth: {
        clientId: process.env.MSAL_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID}`,
        clientSecret: process.env.MSAL_CLIENT_SECRET,
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        }
    }
};