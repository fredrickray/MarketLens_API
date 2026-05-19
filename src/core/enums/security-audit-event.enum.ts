export enum SecurityAuditEvent {
  REGISTER = 'register',
  VERIFY_EMAIL = 'verify_email',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGIN_LOCKOUT = 'login_lockout',
  OAUTH_EXCHANGE = 'oauth_exchange',
  LOGOUT = 'logout',
  GUEST_SESSION_CREATED = 'guest_session_created',
  GUEST_MERGE = 'guest_merge',
  ALERT_CREATED = 'alert_created',
  ALERT_DELETED = 'alert_deleted',
  ANALYSIS_REQUEST = 'analysis_request',
}
