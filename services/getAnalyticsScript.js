function getAnalyticsScript() {
    return `
    (function () {
        // Helper: Generate a UUID
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // Helper: Get or create User ID (persistent in localStorage)
        function getOrCreateUserId() {
            let userId = localStorage.getItem('analytics_user_id');
            if (!userId) {
                userId = generateUUID();
                localStorage.setItem('analytics_user_id', userId);
            }
            return userId;
        }

        // Helper: Get or create Session ID (persistent in sessionStorage)
        function getOrCreateSessionId() {
            let sessionId = sessionStorage.getItem('analytics_session_id');
            if (!sessionId) {
                sessionId = generateUUID();
                sessionStorage.setItem('analytics_session_id', sessionId);
            }
            return sessionId;
        }

        // Helper: Collect device information
        function getDeviceInfo() {
            return {
                screenSize: \`\${window.screen.width}x\${window.screen.height}\`,
                colorDepth: window.screen.colorDepth,
                pixelRatio: window.devicePixelRatio,
                touchPoints: navigator.maxTouchPoints || 0,
                platform: navigator.platform
            };
        }

        // Helper: Get performance metrics
        function getPerformanceMetrics() {
            const timing = window.performance.timing;
            return {
                loadTime: timing.loadEventEnd - timing.navigationStart || null,
                domInteractive: timing.domInteractive - timing.navigationStart || null,
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart || null,
                firstPaint: window.performance.getEntriesByType('paint')[0]?.startTime || null
            };
        }

        // Core function: Send analytics data
        function sendAnalytics(data) {
            try {
                const analyticsData = {
                    eventType: data.eventType || 'custom',
                    url: window.location.href,
                    referrer: document.referrer || null,
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    timestamp: new Date().toISOString(),
                    userId: getOrCreateUserId(),
                    sessionId: getOrCreateSessionId(),
                    ipAddress: null, // Set server-side
                    loadTime: getPerformanceMetrics().loadTime,
                    domInteractive: getPerformanceMetrics().domInteractive,
                    domContentLoaded: getPerformanceMetrics().domContentLoaded,
                    firstPaint: getPerformanceMetrics().firstPaint,
                    colorDepth: getDeviceInfo().colorDepth,
                    pixelRatio: getDeviceInfo().pixelRatio,
                    touchPoints: getDeviceInfo().touchPoints,
                    screenSize: getDeviceInfo().screenSize,
                    platform: getDeviceInfo().platform,
                    eventCategory: data.eventCategory || null,
                    eventAction: data.eventAction || null,
                    eventLabel: data.eventLabel || null,
                    eventValue: data.eventValue || null,
                    customData: data.customData || {}
                };

                if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/analytics', JSON.stringify(analyticsData));
                } else {
                    fetch('/api/analytics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(analyticsData),
                        keepalive: true
                    }).catch((e) => console.error('Fetch error:', e));
                }
            } catch (error) {
                console.error('Analytics error:', error);
            }
        }

        // Page view tracking
        function trackPageView() {
            sendAnalytics({ eventType: 'pageview' });
        }

        // Event tracking
        function trackEvent(category, action, label, value) {
            sendAnalytics({
                eventType: 'custom',
                eventCategory: category,
                eventAction: action,
                eventLabel: label,
                eventValue: value
            });
        }

        // Click tracking
        function initClickTracking() {
            document.addEventListener('click', function (event) {
                const target = event.target.closest('a, button, input[type="submit"], iframe');
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
                        label = target.src;
                    } else if (target.tagName === 'INPUT' && target.type === 'submit') {
                        category = 'Form Submit';
                    }

                    trackEvent(category, action, label);
                }
            });
        }

        // Initialize the analytics API
        window.analyticsAPI = {
            trackPageView: trackPageView,
            trackEvent: trackEvent
        };

        // Track the page view on load
        setTimeout(trackPageView, 0);
        initClickTracking();
    })();
  `;
}

module.exports = { getAnalyticsScript };
