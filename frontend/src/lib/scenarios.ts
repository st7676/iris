// Scenario config -- action names (evidenceType/decision) must match
// backend/app/simulation/evidence.py + backend/app/db/init_db.py's
// ideal_reasoning_chain exactly, or the AI Evaluator's comparison won't
// make sense.
export interface EvidenceMeta {
  id: string
  icon: string
  title: string
  description: string
  revealedAtStep: number
  timestamp: string
}

export interface ActionDef {
  label: string
  evidenceType?: string // for investigative actions -> POST /investigate
  decision?: string // for response actions -> POST /decide
  variant?: 'default' | 'danger'
}

export interface ScenarioConfig {
  id: string
  title: string
  tagline: string
  difficulty: string
  narrative: string
  objectives: string[]
  investigativeActions: ActionDef[]
  responseActions: ActionDef[]
  evidenceLibrary: Record<string, EvidenceMeta>
}

export const SCENARIOS: Record<string, ScenarioConfig> = {
  silent_login_v1: {
    id: 'silent_login_v1',
    title: 'Operation Silent Login',
    tagline: 'Phishing led to account takeover. Trace it before more damage is done.',
    difficulty: 'Junior SOC Analyst',
    narrative:
      'SecureFlow Technologies has flagged unusual activity on an employee account: a login at an unusual hour, a string of failed attempts, and access from a device nobody recognizes. You\'re the analyst on shift. Every minute the attacker stays in, they get closer to whatever they came for.',
    objectives: [
      'Identify how the attacker got in',
      'Confirm what they accessed',
      'Contain the account before more damage is done',
    ],
    investigativeActions: [
      { label: 'Check Email Logs', evidenceType: 'email_logs' },
      { label: 'Check Auth Logs', evidenceType: 'auth_logs' },
    ],
    responseActions: [
      { label: 'Reset Password + MFA', decision: 'reset_password_mfa' },
      { label: 'Isolate Device', decision: 'isolate_device', variant: 'danger' },
    ],
    evidenceLibrary: {
      'Check Email Logs': {
        id: 'email',
        icon: '📧',
        title: 'Email Logs',
        description: 'Phishing email from suspicious@phishing.site',
        revealedAtStep: 1,
        timestamp: '2026-01-15 10:30',
      },
      'Check Auth Logs': {
        id: 'auth',
        icon: '🔐',
        title: 'Authentication Logs',
        description: '5x failed login attempts, then success from new device',
        revealedAtStep: 2,
        timestamp: '2026-01-15 10:35',
      },
      'Reset Password + MFA': {
        id: 'reset',
        icon: '🔑',
        title: 'Password Reset',
        description: 'Password reset and MFA enabled for affected account',
        revealedAtStep: 3,
        timestamp: '2026-01-15 10:40',
      },
      'Isolate Device': {
        id: 'isolate',
        icon: '🚫',
        title: 'Device Isolated',
        description: 'Unrecognized device disconnected from network',
        revealedAtStep: 4,
        timestamp: '2026-01-15 10:42',
      },
    },
  },
  insider_threat_v1: {
    id: 'insider_threat_v1',
    title: 'Operation Insider Threat',
    tagline: 'A departing employee accessed sensitive files after hours. Contain it before they walk out the door.',
    difficulty: 'Junior SOC Analyst',
    narrative:
      'An employee resigned last week. Today is their last day. Overnight, monitoring flagged them accessing files well outside their role — after hours, from home. They\'re still on the payroll for a few more hours. Has anything already left the building?',
    objectives: [
      'Confirm their offboarding status',
      'Identify what was accessed and whether it matches their role',
      'Check for signs of data leaving via removable media',
      'Cut off access before they\'re gone',
    ],
    investigativeActions: [
      { label: 'Check HR Status', evidenceType: 'hr_status' },
      { label: 'Check File Access Logs', evidenceType: 'file_access_logs' },
      { label: 'Check USB Device Logs', evidenceType: 'usb_device_logs' },
    ],
    responseActions: [{ label: 'Revoke Access', decision: 'revoke_access', variant: 'danger' }],
    evidenceLibrary: {
      'Check HR Status': {
        id: 'hr',
        icon: '🧾',
        title: 'HR Status',
        description: 'Employee offboarded — voluntary resignation, last day today',
        revealedAtStep: 1,
        timestamp: 'Today 23:40',
      },
      'Check File Access Logs': {
        id: 'files',
        icon: '📂',
        title: 'File Access Logs',
        description: 'Accessed finance + HR files outside their department, 23:47',
        revealedAtStep: 2,
        timestamp: 'Today 23:47',
      },
      'Check USB Device Logs': {
        id: 'usb',
        icon: '💾',
        title: 'USB Device Logs',
        description: 'External USB connected, 340MB transferred',
        revealedAtStep: 3,
        timestamp: 'Today 23:52',
      },
      'Revoke Access': {
        id: 'revoke',
        icon: '⛔',
        title: 'Access Revoked',
        description: 'All account access revoked immediately',
        revealedAtStep: 4,
        timestamp: 'Today 23:55',
      },
    },
  },
}

export const DEFAULT_SCENARIO_ID = 'silent_login_v1'
