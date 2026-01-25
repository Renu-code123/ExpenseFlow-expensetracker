// Stub for security monitor service
class SecurityMonitor {
  blockSuspiciousIPs() {
    return (req, res, next) => next();
  }

  logSecurityEvent(req, event, data) {
    console.log('Security event logged (stub):', event, data);
  }
}

module.exports = new SecurityMonitor();