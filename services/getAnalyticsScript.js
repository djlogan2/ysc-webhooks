function getAnalyticsScript() {
    return `
  (function() {
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    function getOrCreateUserId() {
      let userId = localStorage.getItem('analytics_user_id');
      if (!userId) {
        userId = generateUUID();
        localStorage.setItem('analytics_user_id', userId);
      }
      return userId;
    }

    function getOrCreateSessionId() {
      let sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    }

    function getPerformanceMetrics() {
      const performance = window.performance;
      if (!performance) return {};
      
      const timing = performance.timing;
      const navigationStart = timing.navigationStart;
      
      return {
        loadTime: timing.loadEventEnd - navigationStart,
        domInteractive: timing.domInteractive - navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
      };
    }

    function getDeviceInfo() {
      return {
        screenSize: \`\${window.screen.width}x\${window.screen.height}\`,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        touchPoints: navigator.maxTouchPoints,
        platform: navigator.platform
      };
    }

    function sendAnalytics(data) {
      try {
        const analyticsData = {
          url: window.location.href,
          referrer: document.referrer || window.location.origin,
          userAgent: navigator.userAgent,
          language: navigator.language,
          timestamp: new Date().toISOString(),
          userId: getOrCreateUserId(),
          sessionId: getOrCreateSessionId(),
          performanceMetrics: getPerformanceMetrics(),
          deviceInfo: getDeviceInfo(),
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

    // ... rest of your existing code (trackPageView, trackEvent, initClickTracking) ...

  })();
  `;
}

module.exports = { getAnalyticsScript };
