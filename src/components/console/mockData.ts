// Mock data for the Aegis interactive console demo

export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface TelemetryLog {
  timestamp: string;
  type: 'gaze' | 'posture' | 'sound' | 'tab' | 'system' | 'network';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface MockCandidate {
  id: string;
  name: string;
  email: string;
  institution: string;
  trustScore: number;
  status: 'secure' | 'warning' | 'flagged';
  gazeVector: string;
  posture: string;
  soundLevel: number;
  avatar: string;
  logs: TelemetryLog[];
}

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 'q1',
    topic: 'Cryptography',
    difficulty: 'medium',
    question: 'Which computational hardness problem forms the security foundation of Diffie-Hellman key exchange?',
    options: [
      'The integer factorization problem (IFP) — difficulty of factoring large semiprime numbers',
      'The discrete logarithm problem (DLP) — given g^x mod p, finding x is infeasible',
      'The elliptic curve point-multiplication hardness over prime fields',
      'The RSA trapdoor permutation one-way function'
    ],
    correctIndex: 1,
    explanation: 'DH security relies on the computational infeasibility of solving the discrete logarithm problem — given g^x mod p in a large prime field, finding x is computationally intractable with current algorithms.'
  },
  {
    id: 'q2',
    topic: 'Password Security',
    difficulty: 'easy',
    question: 'A cryptographic "salt" appended to a password hash primarily defends against which attack class?',
    options: [
      'GPU-accelerated brute-force dictionary attacks over raw hash collision',
      'Man-in-the-middle HTTP session interception via ARP spoofing',
      'Precomputed rainbow table lookup attacks against unsalted hash databases',
      'Side-channel timing analysis attacks on constant-time hash functions'
    ],
    correctIndex: 2,
    explanation: 'Salting adds a random unique value per password before hashing — making precomputed rainbow table lookups infeasible since every password generates a unique hash output, even for identical inputs.'
  },
  {
    id: 'q3',
    topic: 'Network Security',
    difficulty: 'medium',
    question: 'In a Zero-Trust network architecture, which foundational security principle is continuously enforced?',
    options: [
      'Trust all internal network segments implicitly after perimeter firewall clearance',
      'Authenticate only external ingress traffic at the DMZ boundary gateway',
      'Never trust, always verify — every request is authenticated regardless of network origin',
      'Grant broad access permissions to all users who complete initial MFA enrollment'
    ],
    correctIndex: 2,
    explanation: 'Zero-Trust mandates continuous verification of every request, user, and device — regardless of whether traffic originates from inside or outside the corporate network perimeter, eliminating implicit trust zones.'
  },
  {
    id: 'q4',
    topic: 'Blockchain Security',
    difficulty: 'hard',
    question: 'A Sybil attack on a distributed blockchain consensus network primarily targets which cryptographic property?',
    options: [
      'Confidentiality of transaction payloads via asymmetric encryption schemes',
      'Consensus mechanism integrity by forging a majority of fake node identities',
      'Non-repudiation of ECDSA digital signatures on broadcast transactions',
      'Data availability guarantees through distributed ledger replication protocols'
    ],
    correctIndex: 1,
    explanation: 'In a Sybil attack, an adversary creates numerous fake network identities to gain disproportionate control over consensus mechanisms, enabling 51% attacks, double-spend exploits, or eclipse attacks against targeted nodes.'
  },
  {
    id: 'q5',
    topic: 'TLS/PKI',
    difficulty: 'hard',
    question: 'Which TLS ClientHello extension enables name-based virtual hosting by transmitting the target hostname before certificate exchange?',
    options: [
      'ALPN — Application-Layer Protocol Negotiation for HTTP/2 selection',
      'OCSP Stapling — Online Certificate Status Protocol embedded response',
      'SNI — Server Name Indication specifying the hostname pre-certificate',
      'CT — Certificate Transparency log enforcement via SCT validation'
    ],
    correctIndex: 2,
    explanation: 'Server Name Indication (SNI) allows the TLS client to specify the target hostname in the ClientHello message — before any certificate is presented — enabling servers hosting multiple TLS domains to select the correct certificate per virtual host.'
  }
];

export const MOCK_CANDIDATES: MockCandidate[] = [
  {
    id: 'c1',
    name: 'Sarah Jenkins',
    email: 's.jenkins@mit.edu',
    institution: 'MIT',
    trustScore: 99.8,
    status: 'secure',
    gazeVector: 'Forward — Centered (±2°)',
    posture: 'Upright ✓',
    soundLevel: 3,
    avatar: 'SJ',
    logs: [
      { timestamp: '09:14:02', type: 'system',  message: 'Session initialized. Full-screen lock active. Biometric baseline captured.', severity: 'info' },
      { timestamp: '09:14:06', type: 'system',  message: 'Face detection locked — 1 subject confirmed in proctoring frame.', severity: 'info' },
      { timestamp: '09:16:31', type: 'gaze',    message: 'Gaze vector nominal — Forward centered (deviation ±2°). PASS.', severity: 'info' },
      { timestamp: '09:18:44', type: 'posture', message: 'Posture analysis: Upright — Spine within tolerance. PASS.', severity: 'info' },
      { timestamp: '09:21:07', type: 'sound',   message: 'Acoustic environment: 3 dB — Within authorized silence zone. PASS.', severity: 'info' },
      { timestamp: '09:24:18', type: 'network', message: 'Network telemetry: Single endpoint active. No proxy detected.', severity: 'info' },
    ]
  },
  {
    id: 'c2',
    name: 'Marcus Vance',
    email: 'm.vance@stanford.edu',
    institution: 'Stanford',
    trustScore: 87.4,
    status: 'warning',
    gazeVector: 'Right Deviation — 18°',
    posture: 'Slouched ⚠',
    soundLevel: 22,
    avatar: 'MV',
    logs: [
      { timestamp: '09:13:58', type: 'system',  message: 'Session initialized. Full-screen lock active.', severity: 'info' },
      { timestamp: '09:15:12', type: 'gaze',    message: 'WARNING: Gaze deflection — Right lateral deviation 18°. Monitor active.', severity: 'warning' },
      { timestamp: '09:17:34', type: 'posture', message: 'WARNING: Slouched torso detected — Forward lean exceeds 12° threshold.', severity: 'warning' },
      { timestamp: '09:19:02', type: 'sound',   message: 'ALERT: Acoustic spike 22 dB above baseline — Possible verbal activity.', severity: 'warning' },
      { timestamp: '09:20:45', type: 'gaze',    message: 'WARNING: Secondary gaze deflection — Left lateral 12° deviation.', severity: 'warning' },
    ]
  },
  {
    id: 'c3',
    name: 'Elena Rostova',
    email: 'e.rostova@cambridge.ac.uk',
    institution: 'Cambridge',
    trustScore: 54.1,
    status: 'flagged',
    gazeVector: 'Off-Screen — 47°',
    posture: 'Absent ✗',
    soundLevel: 67,
    avatar: 'ER',
    logs: [
      { timestamp: '09:14:11', type: 'system',  message: 'Session initialized. Full-screen lock active.', severity: 'info' },
      { timestamp: '09:15:44', type: 'tab',     message: '⚠ CRITICAL: Tab switch detected — Assessment window lost focus.', severity: 'critical' },
      { timestamp: '09:16:02', type: 'gaze',    message: '⚠ CRITICAL: Face absent from proctoring frame — 8.4 second gap logged.', severity: 'critical' },
      { timestamp: '09:17:18', type: 'sound',   message: '⚠ HIGH ALERT: Acoustic spike 67 dB — Possible external audio source active.', severity: 'critical' },
      { timestamp: '09:18:33', type: 'gaze',    message: '⚠ CRITICAL: Multiple face detection — 2 individuals in proctoring viewport.', severity: 'critical' },
      { timestamp: '09:19:51', type: 'tab',     message: '⚠ CRITICAL: Second tab-switch event. Strike 2 of 3 — Risk escalation active.', severity: 'critical' },
    ]
  },
  {
    id: 'c4',
    name: 'Kofi Mensah',
    email: 'k.mensah@ghanatech.edu',
    institution: 'Ghana Tech',
    trustScore: 98.2,
    status: 'secure',
    gazeVector: 'Forward — Centered (±1°)',
    posture: 'Upright ✓',
    soundLevel: 1,
    avatar: 'KM',
    logs: [
      { timestamp: '09:14:00', type: 'system',  message: 'Session initialized. Full-screen lock active. Biometric baseline captured.', severity: 'info' },
      { timestamp: '09:14:04', type: 'system',  message: 'Face detection locked — 1 subject confirmed.', severity: 'info' },
      { timestamp: '09:16:22', type: 'gaze',    message: 'Gaze vector nominal — Forward centered (deviation ±1°). PASS.', severity: 'info' },
      { timestamp: '09:20:11', type: 'sound',   message: 'Acoustic environment: 1 dB ambient — Optimal silence. PASS.', severity: 'info' },
    ]
  }
];
