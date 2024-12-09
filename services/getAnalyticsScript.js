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
            const blob = new Blob([JSON.stringify(analyticsData)], { type: 'application/json' });
            navigator.sendBeacon('/api/analytics', blob);
          } else {
            fetch('/api/analytics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(analyticsData),
              keepalive: true
            }).catch(() => {});
          }
        } catch (error) {
          console.error('Analytics error:', error);
        }
      }

      function trackPageView() {
        sendAnalytics({ eventType: 'pageview' });
      }

      function trackEvent(category, action, label) {
        sendAnalytics({
          eventType: 'custom',
          eventCategory: category,
          eventAction: action,
          eventLabel: label
        });
      }

      function initClickTracking() {
        document.addEventListener('click', function(event) {
          const target = event.target.closest('a, button, input[type="submit"], iframe'); // Include iframe clicks
          if (target) {
            let category = 'Unknown';
            let action = 'click';
            let label = target.href || target.textContent || target.name || target.src;

            if (target.tagName === 'A') {
              category = 'Link';
              action = target.href.endsWith('.pdf') ? 'PDF Click' : 'Link Click';
            } else if (target.tagName === 'BUTTON') {
              category = 'Button';
            } else if (target.tagName === 'IFRAME') {
              category = 'Iframe';
              label = target.src; // Track iframe source
            } else if (target.tagName === 'INPUT' && target.type === 'submit') {
              category = 'Form Submit';
            }

            trackEvent(category, action, label);
          }
        });
      }

      // Initialize analytics tracking
      window.analyticsAPI = {
        trackEvent: trackEvent,
        trackPageView: trackPageView
      };

      setTimeout(trackPageView, 0); // Track page view on load
      initClickTracking(); // Track user interactions
    })();
  `;
}

module.exports = { getAnalyticsScript };
