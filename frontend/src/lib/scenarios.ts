import type { HotspotSlot } from '../components/DeskScene'

// Scenario config -- action names (evidenceType/decision) must match
// backend/app/simulation/evidence.py + backend/app/db/init_db.py's
// ideal_reasoning_chain exactly, or the AI Evaluator's comparison won't
// make sense.
//
// `details` drives which dedicated view (src/components/evidence-views)
// renders when the analyst opens the item -- an email that looks like a
// real inbox, logs that look like a real log stream, an HR record that
// looks like a real personnel file, a system confirmation for response
// actions -- instead of every evidence type sharing one generic card.
// The literal content here mirrors backend/app/simulation/evidence.py's
// mock data (same IPs, files, device names) so the two stay a plausible
// match, though the frontend renders from this copy rather than the
// investigate response body.
export type EvidenceDetails =
  | {
      kind: 'email'
      fromName: string
      from: string
      to: string
      subject: string
      sentAt: string
      body: string
      suspiciousLink: string
      flagNote: string
    }
  | {
      kind: 'log'
      source: string
      meta?: { label: string; value: string }[]
      rows: { time: string; status: 'FAILED' | 'SUCCESS' | 'ACCESS' | 'CONNECT' | 'TRANSFER' | 'DISCONNECT'; detail: string }[]
    }
  | {
      kind: 'record'
      stamp: string
      fields: { label: string; value: string }[]
    }
  | {
      kind: 'system'
      status: 'success' | 'danger'
      summary: string
      fields?: { label: string; value: string }[]
    }

export interface EvidenceMeta {
  id: string
  icon: string
  title: string
  description: string
  revealedAtStep: number
  timestamp: string
  details: EvidenceDetails
}

export interface ActionDef {
  label: string
  evidenceType?: string // for investigative actions -> POST /investigate
  decision?: string // for response actions -> POST /decide
  variant?: 'default' | 'danger'
  // Which physical object on the desk this action opens -- explicit per
  // action (not inferred from array position) so a paper/folder item like
  // HR Status can live on the folder hotspot instead of a monitor slot,
  // while a scenario's other actions still land on their own slots.
  slot: HotspotSlot
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
      { label: 'Check Email Logs', evidenceType: 'email_logs', slot: 'monitor-left' },
      { label: 'Check Auth Logs', evidenceType: 'auth_logs', slot: 'monitor-center' },
    ],
    responseActions: [
      { label: 'Reset Password + MFA', decision: 'reset_password_mfa', slot: 'phone' },
      { label: 'Isolate Device', decision: 'isolate_device', variant: 'danger', slot: 'folder' },
    ],
    evidenceLibrary: {
      'Check Email Logs': {
        id: 'email',
        icon: '📧',
        title: 'Email Logs',
        description: 'Phishing email from suspicious@phishing.site',
        revealedAtStep: 1,
        timestamp: '2026-01-15 10:30',
        details: {
          kind: 'email',
          fromName: 'SecureFlow IT Support',
          from: 'no-reply@corp-alerts.io',
          to: 'j.martinez@secureflow-tech.io',
          subject: 'Password Reset Requested',
          sentAt: '2026-01-15 10:28',
          body:
            "We noticed a request to reset the password on your SecureFlow account. If this wasn't you, secure your account immediately using the link below.\n\nThis link expires in 15 minutes.",
          suspiciousLink: 'hxxp://secureflow-login.phishing.site/reset?id=8841',
          flagNote: 'Sender domain (corp-alerts.io) does not match secureflow-tech.io',
        },
      },
      'Check Auth Logs': {
        id: 'auth',
        icon: '🔐',
        title: 'Authentication Logs',
        description: '5x failed login attempts, then success from new device',
        revealedAtStep: 2,
        timestamp: '2026-01-15 10:35',
        details: {
          kind: 'log',
          source: 'auth.log — SecureFlow SIEM',
          meta: [
            { label: 'Source IP', value: '203.0.113.42' },
            { label: 'Location', value: 'Bucharest, RO' },
            { label: 'Failed Attempts', value: '4' },
          ],
          rows: [
            { time: '10:30:02', status: 'FAILED', detail: 'Login attempt — invalid password' },
            { time: '10:30:14', status: 'FAILED', detail: 'Login attempt — invalid password' },
            { time: '10:30:29', status: 'FAILED', detail: 'Login attempt — invalid password' },
            { time: '10:31:03', status: 'FAILED', detail: 'Login attempt — invalid password' },
            { time: '10:35:47', status: 'SUCCESS', detail: 'Login succeeded — new device fingerprint (Chrome 118, Windows)' },
          ],
        },
      },
      'Reset Password + MFA': {
        id: 'reset',
        icon: '🔑',
        title: 'Password Reset',
        description: 'Password reset and MFA enabled for affected account',
        revealedAtStep: 3,
        timestamp: '2026-01-15 10:40',
        details: {
          kind: 'system',
          status: 'success',
          summary: 'Password reset and MFA enrollment enforced for the affected account.',
          fields: [
            { label: 'Account', value: 'j.martinez@secureflow-tech.io' },
            { label: 'MFA', value: 'Enabled (TOTP)' },
          ],
        },
      },
      'Isolate Device': {
        id: 'isolate',
        icon: '🚫',
        title: 'Device Isolated',
        description: 'Unrecognized device disconnected from network',
        revealedAtStep: 4,
        timestamp: '2026-01-15 10:42',
        details: {
          kind: 'system',
          status: 'danger',
          summary: 'Unrecognized device disconnected and blocked from the network.',
          fields: [
            { label: 'Device', value: 'Unknown Windows Device (Chrome 118)' },
            { label: 'Action', value: 'Network access revoked' },
          ],
        },
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
      // A personnel record is a physical folder item, not a screen -- and
      // the folder hotspot is otherwise idle in this scenario (its only
      // response action lives on the phone), so HR Status gets it instead
      // of a monitor slot.
      { label: 'Check HR Status', evidenceType: 'hr_status', slot: 'folder' },
      { label: 'Check File Access Logs', evidenceType: 'file_access_logs', slot: 'monitor-left' },
      { label: 'Check USB Device Logs', evidenceType: 'usb_device_logs', slot: 'monitor-center' },
    ],
    responseActions: [{ label: 'Revoke Access', decision: 'revoke_access', variant: 'danger', slot: 'phone' }],
    evidenceLibrary: {
      'Check HR Status': {
        id: 'hr',
        icon: '🧾',
        title: 'HR Status',
        description: 'Employee offboarded — voluntary resignation, last day today',
        revealedAtStep: 1,
        timestamp: 'Today 23:40',
        details: {
          kind: 'record',
          stamp: 'OFFBOARDED',
          fields: [
            { label: 'Employee', value: 'R. Kessler' },
            { label: 'Employee ID', value: 'SF-4471' },
            { label: 'Department', value: 'Marketing' },
            { label: 'Employee Status', value: 'Offboarded — Last Day' },
            { label: 'Termination Date', value: '2026-08-01' },
            { label: 'Reason', value: 'Voluntary Resignation' },
          ],
        },
      },
      'Check File Access Logs': {
        id: 'files',
        icon: '📂',
        title: 'File Access Logs',
        description: 'Accessed finance + HR files outside their department, 23:47',
        revealedAtStep: 2,
        timestamp: 'Today 23:47',
        details: {
          kind: 'log',
          source: 'file-access.log — DLP Monitor',
          meta: [
            { label: 'Access Time', value: '23:47' },
            { label: 'Department Match', value: 'No (Marketing accessing Finance/HR)' },
          ],
          rows: [
            { time: '23:47:02', status: 'ACCESS', detail: '/finance/Q3_projections.xlsx' },
            { time: '23:47:19', status: 'ACCESS', detail: '/hr/salary_data.csv' },
          ],
        },
      },
      'Check USB Device Logs': {
        id: 'usb',
        icon: '💾',
        title: 'USB Device Logs',
        description: 'External USB connected, 340MB transferred',
        revealedAtStep: 3,
        timestamp: 'Today 23:52',
        details: {
          kind: 'log',
          source: 'usb-monitor.log — Endpoint Agent',
          meta: [
            { label: 'Device', value: 'SanDisk USB 3.0 64GB' },
            { label: 'Data Transferred', value: '340 MB' },
          ],
          rows: [
            { time: '23:52:01', status: 'CONNECT', detail: 'External storage device attached (SanDisk USB 3.0 64GB)' },
            { time: '23:52:04', status: 'TRANSFER', detail: '340MB written to E:\\' },
            { time: '23:58:40', status: 'DISCONNECT', detail: 'Device removed' },
          ],
        },
      },
      'Revoke Access': {
        id: 'revoke',
        icon: '⛔',
        title: 'Access Revoked',
        description: 'All account access revoked immediately',
        revealedAtStep: 4,
        timestamp: 'Today 23:55',
        details: {
          kind: 'system',
          status: 'danger',
          summary: 'All account access revoked immediately — VPN, SSO, and building badge disabled.',
          fields: [
            { label: 'Employee', value: 'R. Kessler (SF-4471)' },
            { label: 'Revoked At', value: 'Today 23:55' },
          ],
        },
      },
    },
  },
}

export const DEFAULT_SCENARIO_ID = 'silent_login_v1'

// Shared "look up a scenario, fall back to the default if missing/unknown"
// lookup -- used anywhere a scenario id might be undefined (not yet
// picked) or stale (e.g. an old link), instead of each page repeating
// `SCENARIOS[id] ?? SCENARIOS[DEFAULT_SCENARIO_ID]` independently.
export function getScenario(scenarioId: string | undefined): ScenarioConfig {
  return SCENARIOS[scenarioId ?? DEFAULT_SCENARIO_ID] ?? SCENARIOS[DEFAULT_SCENARIO_ID]
}
