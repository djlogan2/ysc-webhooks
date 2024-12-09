function getAnalyticsScript() {
    return `
    (function() {
      function sendAnalytics(data) {
        try {
          const analyticsData = {
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screenSize: \`\${window.screen.width}x\${window.screen.height}\`,
            language: navigator.language,
            timestamp: new Date().toISOString(),
            ...data
          };

          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics', JSON.stringify(analyticsData));
          } else {
            fetch('/api/analytics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(analyticsData),
              keepalive: true
            }).catch(() => {});
          }
        } catch (error) {
          // Silently ignore any errors
        }
      }

      function trackPageView() {
        sendAnalytics({ eventType: 'pageview' });
      }

      window.analyticsAPI = {
        trackEvent: function(category, action, label, value) {
          sendAnalytics({
            eventType: 'custom',
            eventCategory: category,
            eventAction: action,
            eventLabel: label,
            eventValue: value
          });
        },
        trackPageView: trackPageView
      };

      // Initialize page view tracking
      setTimeout(trackPageView, 0);
    })();
  `;
}

module.exports = { getAnalyticsScript };