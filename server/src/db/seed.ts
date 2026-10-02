import { db } from './database.js';
import { CryptoService } from '../services/cryptoService.js';
import { LedgerService } from '../services/ledgerService.js';
import { StorageService } from '../services/storageService.js';
import { AIService } from '../services/aiService.js';
import { User, Case, DocumentCategory, ConfidentialityLevel, ReviewStatus, EvidenceType } from '../types/index.js';

export async function seedDatabase() {
  console.log('[SEED] Starting seed process for NyayaSetu...');
  db.clear();

  // Ensure Genesis Block
  LedgerService.ensureGenesisBlock();

  // 1. Seed Users (8 Roles)
  const defaultPassword = 'NyayaSetu@2026!';

  const rawUsers: Array<Omit<User, 'passwordHash' | 'salt'>> = [
    {
      id: 'USR-ADMIN-01',
      agencyId: 'NCRB-ADM-001',
      name: 'Aditya Swaminathan',
      email: 'admin@ncrb.gov.in',
      role: 'admin',
      department: 'Central IT & Systems',
      organization: 'National Crime Records Bureau',
      badgeNumber: 'NCRB-9021',
      jurisdiction: 'National Headquarters, New Delhi',
      isActive: true,
      mfaEnabled: true,
      mfaSecret: '123456',
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'USR-IO-01',
      agencyId: 'DEL-IO-442',
      name: 'Inspector Rajesh Verma',
      email: 'io.verma@delhipolice.gov.in',
      role: 'investigating_officer',
      department: 'Crime Branch Special Cell',
      organization: 'Delhi Police',
      badgeNumber: 'DP-CB-4421',
      jurisdiction: 'South & South-East District, New Delhi',
      isActive: true,
      mfaEnabled: true,
      mfaSecret: '123456',
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'USR-SUP-01',
      agencyId: 'DEL-ACP-108',
      name: 'ACP Sunita Mehta',
      email: 'sup.mehta@delhipolice.gov.in',
      role: 'supervisor',
      department: 'Crime Branch Special Cell',
      organization: 'Delhi Police',
      badgeNumber: 'DP-IPS-108',
      jurisdiction: 'South District, New Delhi',
      isActive: true,
      mfaEnabled: true,
      mfaSecret: '123456',
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'USR-PROS-01',
      agencyId: 'DEL-PP-309',
      name: 'Adv. Arvind Sharma',
      email: 'prosecutor.sharma@delhi.gov.in',
      role: 'prosecutor',
      department: 'Directorate of Prosecution',
      organization: 'Govt of NCT Delhi',
      badgeNumber: 'DOP-309',
      jurisdiction: 'Saket District Courts, New Delhi',
      isActive: true,
      mfaEnabled: true,
      mfaSecret: '123456',
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'USR-JUDGE-01',
      agencyId: 'DHJS-771',
      name: 'Hon. Justice Manpreet Kaur',
      email: 'judge.kaur@delhicourts.nic.in',
      role: 'judge',
      department: 'Special CBI & Crime Court',
      organization: 'Delhi Judicial Service',
      badgeNumber: 'DJS-COURT-04',
      jurisdiction: 'Saket District Courts, New Delhi',
      isActive: true,
      mfaEnabled: true,
      mfaSecret: '123456',
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'USR-FOR-01',
      agencyId: 'CFSL-EXP-82',
      name: 'Dr. Ramesh Rao',
      email: 'forensic.rao@cfsl.gov.in',
      role: 'forensic_officer',
      department: 'Ballistics & Digital Forensics',
      organization: 'Central Forensic Science Laboratory (CFSL)',
      badgeNumber: 'CFSL-B-82',
      jurisdiction: 'CBI / CFSL Campus, New Delhi',
      isActive: true,
      mfaEnabled: true,
      mfaSecret: '123456',
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'USR-AUD-01',
      agencyId: 'MHA-AUD-05',
      name: 'Ananya Gupta',
      email: 'auditor.gupta@mha.gov.in',
      role: 'auditor',
      department: 'Cyber & Information Security Audit Wing',
      organization: 'Ministry of Home Affairs',
      badgeNumber: 'MHA-CIS-05',
      jurisdiction: 'National Operations',
      isActive: true,
      mfaEnabled: true,
      mfaSecret: '123456',
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'USR-EXT-01',
      agencyId: 'EXT-LEGAL-99',
      name: 'Adv. Rohit Bansal',
      email: 'external.advocate@lawfirm.in',
      role: 'external_stakeholder',
      department: 'External Legal Counsel',
      organization: 'Bansal & Associates Legal Partners',
      badgeNumber: 'BAR-DEL-2018-912',
      jurisdiction: 'Delhi Bar Council',
      isActive: true,
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    }
  ];

  for (const raw of rawUsers) {
    const salt = CryptoService.generateSalt();
    const passwordHash = CryptoService.hashPassword(defaultPassword, salt);
    const keyPair = CryptoService.generateKeyPair();

    db.user_private_keys[raw.id] = keyPair.privateKey;

    const user: User = {
      ...raw,
      salt,
      passwordHash,
      publicKey: keyPair.publicKey
    };
    db.users.push(user);
  }

  // 2. Seed Cases
  const case1: Case = {
    id: 'CAS-2026-001',
    caseNumber: 'FIR-2026-CRB-101',
    title: 'Cyber Financial Siphoning & Identity Theft via Payment Gateway Bypass',
    type: 'Cyber Crime & Financial Fraud',
    jurisdiction: 'South District, New Delhi',
    policeStation: 'Hauz Khas Crime Branch',
    department: 'Crime Branch Special Cell',
    status: 'Active Investigation' as const,
    priority: 'Critical' as const,
    investigatingOfficerId: 'USR-IO-01',
    investigatingOfficerName: 'Inspector Rajesh Verma',
    assignedTeam: ['USR-IO-01', 'USR-FOR-01'],
    incidentDate: '2026-08-14',
    filingDate: '2026-08-15',
    courtName: 'Court of Special Magistrate (Cyber Crime), Saket',
    judgeName: 'Hon. Justice Manpreet Kaur',
    isLegalHold: true,
    summary: 'Organized cyber syndicate siphoned ₹4.2 Crore from corporate escrow accounts using SIM-swapping, API token interception, and forged KYC identities.',

    // Form I.F.1
    district: 'South District, New Delhi',
    state: 'Delhi (NCT)',
    firYear: 2026,
    actsAndSections: [
      { act: 'Bharatiya Nyaya Sanhita (BNS), 2023', sections: 'Section 318(4) [Cheating], 336(3) [Forgery of Electronic Record], 338, 340(2)' },
      { act: 'Information Technology Act, 2000', sections: 'Section 66 [Computer System Tampering], 66C [Identity Theft], 66D [Cheating by Impersonation]' }
    ],
    occurrenceDay: 'Friday',
    occurrenceDateFrom: '2026-08-14',
    occurrenceDateTo: '2026-08-14',
    occurrenceTimeFrom: '21:15 Hrs',
    occurrenceTimeTo: '23:45 Hrs',
    informationReceivedDate: '2026-08-15',
    informationReceivedTime: '08:30 Hrs',
    generalDiaryNo: 'GD-2026-894',
    informationType: 'Written',
    placeOfOccurrence: 'Plot 44, Okhla Industrial Area Phase-III & Virtual Payment Gateway Endpoints',
    distanceFromPS: '4.2 KM South-East',
    beatNo: 'Beat No. 6',
    complainantName: 'Sunil Malhotra (Director, Zenith FinTech Escrow Pvt Ltd)',
    complainantFatherSpouse: 'S/o Late Sh. O.P. Malhotra',
    complainantDobOrAge: '46 Years',
    complainantNationality: 'Indian',
    complainantOccupation: 'Chief Technology Officer & Director',
    complainantAddress: 'B-12, Greater Kailash-I, New Delhi - 110048',
    complainantPhone: '+91 98101 22334',
    suspectDetails: 'Syndicate operating under aliases "CryptoViper" & "ShadowProxy" using compromised IP pool 185.220.101.45 and mule accounts in Mumbai and Dubai.',
    propertiesStolenOrInvolved: 'Siphoned funds ₹4,20,00,000/- across 14 mule banking channels, encrypted logs, 2 server disk images, 4 SIM cards',
    totalEstimatedValue: '₹ 4,20,00,000/-',
    firContents: 'On 15/08/2026 at 08:30 hours, complainant Sunil Malhotra presented a written complaint stating that on the intervening night of 14/08/2026 between 21:15 hrs and 23:45 hrs, unauthorized automated API transactions were initiated from company escrow servers via session token hijacking. The fraudsters intercepted 2FA SMS tokens through rogue SIM cloning and siphoned ₹4.2 Crore into multiple designated mule bank accounts. Finding prima facie cognizable offences under BNS Sec 318(4)/336(3) and IT Act Sec 66/66C/66D, this FIR is registered and handed over to Inspector Rajesh Verma for immediate investigation.',
    officerInChargeName: 'Inspector Rajesh Verma',
    officerInChargeRank: 'Inspector (Crime Branch)',
    officerInChargeBadge: 'DP-CYB-404',

    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-18T14:30:00Z'
  };

  const case2: Case = {
    id: 'CAS-2026-002',
    caseNumber: 'FIR-2026-CRB-102',
    title: 'Armed Robbery & Ballistic Recovery at Hauz Khas Commercial Arcade',
    type: 'Organized Armed Crime',
    jurisdiction: 'South District, New Delhi',
    policeStation: 'Hauz Khas Crime Branch',
    department: 'Crime Branch Special Cell',
    status: 'Under Review' as const,
    priority: 'High' as const,
    investigatingOfficerId: 'USR-IO-01',
    investigatingOfficerName: 'Inspector Rajesh Verma',
    assignedTeam: ['USR-IO-01', 'USR-SUP-01', 'USR-FOR-01'],
    incidentDate: '2026-08-02',
    filingDate: '2026-08-03',
    courtName: 'Sessions Court No. 3, Saket',
    judgeName: 'Hon. Justice Manpreet Kaur',
    isLegalHold: true,
    summary: 'Armed robbery incident involving firearm discharge. Country-made 9mm firearm, fired brass casing, and bullet fragments seized at scene.',

    // Form I.F.1
    district: 'South District, New Delhi',
    state: 'Delhi (NCT)',
    firYear: 2026,
    actsAndSections: [
      { act: 'Bharatiya Nyaya Sanhita (BNS), 2023', sections: 'Section 309(4) [Robbery with hurt], 310(2) [Dacoity with deadly weapon], 109 [Attempt to Murder]' },
      { act: 'Arms Act, 1959', sections: 'Section 25(1B)(a), Section 27 [Use of Prohibited Arms]' }
    ],
    occurrenceDay: 'Sunday',
    occurrenceDateFrom: '2026-08-02',
    occurrenceDateTo: '2026-08-02',
    occurrenceTimeFrom: '22:15 Hrs',
    occurrenceTimeTo: '22:40 Hrs',
    informationReceivedDate: '2026-08-03',
    informationReceivedTime: '00:15 Hrs',
    generalDiaryNo: 'GD-2026-412',
    informationType: 'Written',
    placeOfOccurrence: 'Jewelry Mart, Shop #14, Hauz Khas Commercial Arcade, E-Block Market',
    distanceFromPS: '1.8 KM North-West',
    beatNo: 'Beat No. 2',
    complainantName: 'Rameshwar Dayal Verma (Proprietor, Verma Jewelers)',
    complainantFatherSpouse: 'S/o Sh. Harish Chandra Verma',
    complainantDobOrAge: '54 Years',
    complainantNationality: 'Indian',
    complainantOccupation: 'Jeweler / Merchant',
    complainantAddress: 'C-33, Hauz Khas Enclave, New Delhi',
    complainantPhone: '+91 98188 77665',
    suspectDetails: 'Three masked assailants armed with country-made pistol and iron rods fleeing on black motorcycle without registration plate (WB-series engine mark).',
    propertiesStolenOrInvolved: 'Gold ornaments (estimated 480 grams), country-made 9mm firearm (WB-8819), 1 fired 9mm cartridge casing, 2 live rounds',
    totalEstimatedValue: '₹ 38,50,000/-',
    firContents: 'Complainant reported that while closing the jewelry shop at 22:15 hours, three unknown persons wearing helmets entered, pointed a pistol at staff, fired one shot in the air hitting the ceiling display board, assaulted security guard, and looted gold trays worth approx ₹38.5 Lakhs. Fired cartridge casing and weapon recovered during subsequent cordon. Registered under Sections 309(4)/310(2) BNS and Sec 25/27 Arms Act.',
    officerInChargeName: 'Inspector Rajesh Verma',
    officerInChargeRank: 'Inspector (Crime Branch)',
    officerInChargeBadge: 'DP-CRB-108',

    createdAt: '2026-08-03T11:20:00Z',
    updatedAt: '2026-08-20T16:45:00Z'
  };

  const case3: Case = {
    id: 'CAS-2026-003',
    caseNumber: 'FIR-2026-WS-103',
    title: 'Women Safety Division: Digital Harassment, Extortion & Defamation',
    type: 'Women Safety & Cyber Stalking',
    jurisdiction: 'South-East District, New Delhi',
    policeStation: 'Special Crime Cell for Women & Children',
    department: 'Women Safety Division',
    status: 'Filed' as const,
    priority: 'High' as const,
    investigatingOfficerId: 'USR-IO-01',
    investigatingOfficerName: 'Inspector Rajesh Verma',
    assignedTeam: ['USR-IO-01'],
    incidentDate: '2026-08-10',
    filingDate: '2026-08-11',
    courtName: 'Special Fast Track Mahila Court, Saket',
    judgeName: 'Hon. Justice Manpreet Kaur',
    isLegalHold: true,
    summary: 'Perpetrator extorted female IT professional using deepfake imagery, unauthorized cloud account takeover, and encrypted messaging threats.',

    // Form I.F.1
    district: 'South-East District, New Delhi',
    state: 'Delhi (NCT)',
    firYear: 2026,
    actsAndSections: [
      { act: 'Bharatiya Nyaya Sanhita (BNS), 2023', sections: 'Section 78 [Stalking], 79 [Word, gesture intended to insult modesty of a woman], 308(2) [Extortion]' },
      { act: 'Information Technology Act, 2000', sections: 'Section 66E [Violation of Privacy], 67A [Publishing sexually explicit material in electronic form]' }
    ],
    occurrenceDay: 'Monday',
    occurrenceDateFrom: '2026-08-05',
    occurrenceDateTo: '2026-08-10',
    occurrenceTimeFrom: '10:00 Hrs',
    occurrenceTimeTo: '21:00 Hrs',
    informationReceivedDate: '2026-08-11',
    informationReceivedTime: '11:45 Hrs',
    generalDiaryNo: 'GD-2026-302',
    informationType: 'Written',
    placeOfOccurrence: 'Victim Residence at Defence Colony & Digital Cloud Messaging Platforms',
    distanceFromPS: '3.0 KM West',
    beatNo: 'Beat No. 1',
    complainantName: 'Confidential Victim (Identity Protected under Sec 73 BNS)',
    complainantFatherSpouse: 'D/o Sh. K.L. Nambiar',
    complainantDobOrAge: '29 Years',
    complainantNationality: 'Indian',
    complainantOccupation: 'Senior Software Engineer',
    complainantAddress: 'Defence Colony, New Delhi',
    complainantPhone: '+91 98711 00998',
    suspectDetails: 'Accused identified as ex-colleague "Vikramaditya S." operating through ProtonMail and virtual VOIP numbers.',
    propertiesStolenOrInvolved: 'Extortion demand ₹15,00,000/-, 32 digital screenshots, cloud forensic backup archive, forensic mobile extraction report',
    totalEstimatedValue: '₹ 15,00,000/-',
    firContents: 'Victim lodged formal complaint detailing persistent stalking, transmission of manipulated deepfake photographs generated without consent, unauthorized login to victim private iCloud, and demand of ₹15 Lakhs under threat of mass circulation. Registered under BNS Sec 78/79/308(2) and IT Act Sec 66E/67A.',
    officerInChargeName: 'Inspector Rajesh Verma',
    officerInChargeRank: 'Inspector (Special Cell)',
    officerInChargeBadge: 'DP-WS-771',

    createdAt: '2026-08-11T14:10:00Z',
    updatedAt: '2026-08-22T10:15:00Z'
  };

  const case4: Case = {
    id: 'CAS-2026-004',
    caseNumber: 'FIR-2026-CR-104',
    title: 'Cross-District Cyber Banking Fraud & DarkNet Mule Network',
    type: 'Cyber Crime & Financial Fraud',
    jurisdiction: 'South West District, New Delhi',
    policeStation: 'Dwarka Sector 23 Cyber PS',
    department: 'Cyber Crime Police Station',
    status: 'Active Investigation' as const,
    priority: 'Critical' as const,
    investigatingOfficerId: 'USR-IO-01',
    investigatingOfficerName: 'Inspector Rajesh Verma',
    assignedTeam: ['USR-IO-01', 'USR-FOR-01'],
    incidentDate: '2026-08-08',
    filingDate: '2026-08-09',
    courtName: 'Dwarka District Courts (CMM Cyber)',
    judgeName: 'Hon. Justice Manpreet Kaur',
    isLegalHold: true,
    summary: 'Organized cyber syndicate siphoned funds using phishing APKs, Telegram crypto escrow laundering, and SIM cloning across Dwarka and Kolkata.',
    district: 'South West District',
    state: 'Delhi (NCT)',
    firYear: 2026,
    actsAndSections: [
      { act: 'Bharatiya Nyaya Sanhita (BNS), 2023', sections: 'Section 318(4) [Cheating], 336(3) [Forgery of Electronic Record], 61(2) [Conspiracy]' },
      { act: 'Information Technology Act, 2000', sections: 'Section 66C [Identity Theft], 66D [Cheating by Impersonation]' }
    ],
    occurrenceDay: 'Saturday',
    occurrenceDateFrom: '2026-08-08',
    occurrenceDateTo: '2026-08-08',
    occurrenceTimeFrom: '14:00 Hrs',
    occurrenceTimeTo: '18:30 Hrs',
    informationReceivedDate: '2026-08-09',
    informationReceivedTime: '10:15 Hrs',
    generalDiaryNo: 'GD-2026-512',
    informationType: 'Written',
    placeOfOccurrence: 'Sector 10 Dwarka & Virtual IP Endpoints',
    distanceFromPS: '3.5 KM North',
    beatNo: 'Beat No. 4',
    complainantName: 'Tarun Singhania',
    complainantFatherSpouse: 'S/o R.K. Singhania',
    complainantDobOrAge: '52 Years',
    complainantNationality: 'Indian',
    complainantOccupation: 'Business Executive',
    complainantAddress: 'B-4/29, Vasant Vihar Enclave, New Delhi',
    complainantPhone: '+91 98100 33441',
    suspectDetails: 'Syndicate run by Amitav Roy (Crypto Roy) and Nitin Chopra operating DarkNet Telegram mule network.',
    propertiesStolenOrInvolved: 'Siphoned funds ₹78,00,000/- across 8 mule accounts and 12 crypto wallets',
    totalEstimatedValue: '₹ 78,00,000/-',
    firContents: 'Complainant reported receiving malicious APK link disguised as electricity bill payment portal resulting in unauthorized diversion of ₹78 Lakhs into Kolkata and Delhi mule accounts.',
    officerInChargeName: 'Inspector Rajesh Verma',
    officerInChargeRank: 'Inspector (Cyber)',
    officerInChargeBadge: 'DP-CYB-104',
    createdAt: '2026-08-09T11:00:00Z',
    updatedAt: '2026-08-18T16:00:00Z'
  };

  const case5: Case = {
    id: 'CAS-2026-005',
    caseNumber: 'FIR-2026-LP-105',
    title: 'Central Market Gold Chain & Handbag Snatching Spree by Armed Bike Gang',
    type: 'Snatching & Street Robbery',
    jurisdiction: 'South-East District, New Delhi',
    policeStation: 'Lajpat Nagar PS',
    department: 'Crime Branch Anti-Snatching Squad',
    status: 'Active Investigation' as const,
    priority: 'High' as const,
    investigatingOfficerId: 'USR-IO-01',
    investigatingOfficerName: 'Inspector Rajesh Verma',
    assignedTeam: ['USR-IO-01'],
    incidentDate: '2026-08-16',
    filingDate: '2026-08-16',
    courtName: 'Saket District Courts, New Delhi',
    judgeName: 'Hon. Justice Manpreet Kaur',
    isLegalHold: true,
    summary: 'Series of daylight gold necklace and mobile phone snatchings at Central Market pedestrian lanes by masked pillion riders on KTM Duke bikes.',
    district: 'South-East District',
    state: 'Delhi (NCT)',
    firYear: 2026,
    actsAndSections: [
      { act: 'Bharatiya Nyaya Sanhita (BNS), 2023', sections: 'Section 304(1) [Snatching], 304(2) [Aggravated Snatching with injury], 309(4) [Robbery]' }
    ],
    occurrenceDay: 'Sunday',
    occurrenceDateFrom: '2026-08-16',
    occurrenceDateTo: '2026-08-16',
    occurrenceTimeFrom: '17:30 Hrs',
    occurrenceTimeTo: '19:45 Hrs',
    informationReceivedDate: '2026-08-16',
    informationReceivedTime: '20:30 Hrs',
    generalDiaryNo: 'GD-2026-729',
    informationType: 'Written',
    placeOfOccurrence: 'Block-II Central Market Pedestrian Arcade, Lajpat Nagar',
    distanceFromPS: '0.8 KM East',
    beatNo: 'Beat No. 3 (Central Market)',
    complainantName: 'Sunita Mehra',
    complainantFatherSpouse: 'W/o Rajesh Mehra',
    complainantDobOrAge: '38 Years',
    complainantNationality: 'Indian',
    complainantOccupation: 'Teacher',
    complainantAddress: 'L-14, Lajpat Nagar-II, New Delhi',
    complainantPhone: '+91 98733 11220',
    suspectDetails: 'Accused Irfan Khan (Cheeta) and Bunty (Langda) operating on orange KTM Duke bike (DL-3S-CX-8812).',
    propertiesStolenOrInvolved: 'Gold chain (24g), iPhone 15 Pro, leather handbag with cash ₹18,000',
    totalEstimatedValue: '₹ 2,90,000/-',
    firContents: 'While walking near Central Market gate, two pillion riders on orange KTM Duke motorcycle forcibly snatched gold chain and handbag causing complainant to fall with minor abrasions.',
    officerInChargeName: 'Inspector Rajesh Verma',
    officerInChargeRank: 'Inspector (Anti-Snatching Squad)',
    officerInChargeBadge: 'DP-LP-205',
    createdAt: '2026-08-16T21:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z'
  };

  const case6: Case = {
    id: 'CAS-2026-006',
    caseNumber: 'FIR-2026-ROH-106',
    title: 'Rohini Commercial Complex Armed Extortion, Firing & Gang Clashes',
    type: 'Organized Armed Crime',
    jurisdiction: 'Rohini District, New Delhi',
    policeStation: 'Rohini North PS',
    department: 'Special Staff Rohini',
    status: 'Active Investigation' as const,
    priority: 'Critical' as const,
    investigatingOfficerId: 'USR-IO-01',
    investigatingOfficerName: 'Inspector Rajesh Verma',
    assignedTeam: ['USR-IO-01', 'USR-FOR-01'],
    incidentDate: '2026-08-18',
    filingDate: '2026-08-19',
    courtName: 'Rohini District Courts',
    judgeName: 'Hon. Justice Manpreet Kaur',
    isLegalHold: true,
    summary: 'Monu Bawana syndicate members opened fire outside confectionery shop demanding ₹25 Lakh protection money.',
    district: 'Rohini District',
    state: 'Delhi (NCT)',
    firYear: 2026,
    actsAndSections: [
      { act: 'Bharatiya Nyaya Sanhita (BNS), 2023', sections: 'Section 308(2) [Extortion], 109 [Attempt to Murder], 61(2) [Conspiracy]' },
      { act: 'Arms Act, 1959', sections: 'Section 25(1B)(a), Section 27' }
    ],
    occurrenceDay: 'Tuesday',
    occurrenceDateFrom: '2026-08-18',
    occurrenceDateTo: '2026-08-18',
    occurrenceTimeFrom: '20:15 Hrs',
    occurrenceTimeTo: '20:30 Hrs',
    informationReceivedDate: '2026-08-19',
    informationReceivedTime: '01:00 Hrs',
    generalDiaryNo: 'GD-2026-904',
    informationType: 'Written',
    placeOfOccurrence: 'Plot 18, Commercial Arcade, Sector 7 Rohini',
    distanceFromPS: '2.1 KM West',
    beatNo: 'Beat No. 5 (Sector 7)',
    complainantName: 'Kishore Aggarwal',
    complainantFatherSpouse: 'S/o Satpal Aggarwal',
    complainantDobOrAge: '50 Years',
    complainantNationality: 'Indian',
    complainantOccupation: 'Merchant / Sweet House Proprietor',
    complainantAddress: 'House 88, Sector 8 Rohini, Delhi',
    complainantPhone: '+91 98111 88992',
    suspectDetails: 'Gangster Monu Bawana and shooter Deepak Rana firing 2 rounds in air from .32 bore pistol.',
    propertiesStolenOrInvolved: 'Extortion demand ₹25,00,000/-, 2 spent .32 bullet cartridges recovered from scene',
    totalEstimatedValue: '₹ 25,00,000/-',
    firContents: 'Complainant stated that two armed men arrived on motorcycle, handed extortion demand letter under name of Bawana Syndicate, and fired two bullets hitting shop sign board to terrorize market.',
    officerInChargeName: 'Inspector Rajesh Verma',
    officerInChargeRank: 'Inspector (Special Staff)',
    officerInChargeBadge: 'DP-ROH-306',
    createdAt: '2026-08-19T02:00:00Z',
    updatedAt: '2026-08-21T14:00:00Z'
  };

  const case7: Case = {
    id: 'CAS-2026-007',
    caseNumber: 'FIR-2026-KB-107',
    title: 'Karol Bagh Automobile Lifting & Counterfeit Chassis Tampering Nexus',
    type: 'Vehicle Theft & Organized Gang',
    jurisdiction: 'Central District, New Delhi',
    policeStation: 'Karol Bagh PS',
    department: 'Auto Theft Squad (AATS)',
    status: 'Active Investigation' as const,
    priority: 'High' as const,
    investigatingOfficerId: 'USR-IO-01',
    investigatingOfficerName: 'Inspector Rajesh Verma',
    assignedTeam: ['USR-IO-01'],
    incidentDate: '2026-08-12',
    filingDate: '2026-08-13',
    courtName: 'Tis Hazari Courts, Delhi',
    judgeName: 'Hon. Justice Manpreet Kaur',
    isLegalHold: true,
    summary: 'Inter-state auto-lifting syndicate stealing Creta and Swift vehicles using frequency jammers and fake RC documents.',
    district: 'Central District',
    state: 'Delhi (NCT)',
    firYear: 2026,
    actsAndSections: [
      { act: 'Bharatiya Nyaya Sanhita (BNS), 2023', sections: 'Section 303(2) [Theft], 317(2) [Stolen Property], 336(3) [Forgery]' }
    ],
    occurrenceDay: 'Wednesday',
    occurrenceDateFrom: '2026-08-12',
    occurrenceDateTo: '2026-08-12',
    occurrenceTimeFrom: '21:00 Hrs',
    occurrenceTimeTo: '23:00 Hrs',
    informationReceivedDate: '2026-08-13',
    informationReceivedTime: '08:00 Hrs',
    generalDiaryNo: 'GD-2026-610',
    informationType: 'Written',
    placeOfOccurrence: 'Ajmal Khan Road Parking, Karol Bagh',
    distanceFromPS: '1.2 KM South',
    beatNo: 'Beat No. 1 (Ajmal Khan)',
    complainantName: 'Gaurav Chawla',
    complainantFatherSpouse: 'S/o M.L. Chawla',
    complainantDobOrAge: '36 Years',
    complainantNationality: 'Indian',
    complainantOccupation: 'Chartered Accountant',
    complainantAddress: 'B-21, Rajinder Nagar, New Delhi',
    complainantPhone: '+91 98119 55443',
    suspectDetails: 'Vicky Rathore and Satish Gurjar using electronic key decoders.',
    propertiesStolenOrInvolved: 'White Hyundai Creta (DL-8C-AA-9912), GPS jammer device',
    totalEstimatedValue: '₹ 16,50,000/-',
    firContents: 'Complainant parked his vehicle at Ajmal Khan Road parking at 21:00 hrs. Upon return at 23:00 hrs, vehicle was missing. CCTV footage revealed two persons unlocking vehicle within 90 seconds using electronic scanner tool.',
    officerInChargeName: 'Inspector Rajesh Verma',
    officerInChargeRank: 'Inspector (AATS)',
    officerInChargeBadge: 'DP-KB-407',
    createdAt: '2026-08-13T09:00:00Z',
    updatedAt: '2026-08-20T15:00:00Z'
  };

  db.cases.push(case1, case2, case3, case4, case5, case6, case7);

  // 3. Seed Documents & Files in Storage
  const sampleDoc1Content = Buffer.from(`FIRST INFORMATION REPORT (FIR)
Under Section 154 Cr.P.C. / BNSS Section 173
Police Station: Hauz Khas Crime Branch, New Delhi
FIR No: FIR-2026-CRB-101
Date of Occurrence: 14/08/2026 21:30 Hrs
Date of Report: 15/08/2026 09:00 Hrs

Complainant: Pooja Sharma, Chief Financial Officer, Apex InfraEscrow Ltd.
Accused: Vikram Malhotra, Sunil Joshi, and unknown co-conspirators.

Offences Alleged:
- IPC Section 420 / BNS 318(4) - Cheating and dishonestly inducing delivery of property
- IPC Section 120B / BNS 61(2) - Criminal Conspiracy
- Information Technology Act Section 66C & 66D - Identity Theft and Cheating by Impersonation

Brief Facts:
The complainant reported unauthorized diversion of ₹4.2 Crore from company escrow account 90182819 to offshore intermediate mule accounts. Preliminary digital analysis reveals rogue SIM swap and API token replay. Investigating Officer Inspector Rajesh Verma initiated immediate freezing of accounts under Section 102 Cr.P.C.`, 'utf-8');

  const doc1Save = await StorageService.saveFile({
    buffer: sampleDoc1Content,
    originalFileName: 'FIR_2026_CRB_101_Formal_Filing.pdf',
    mimeType: 'application/pdf',
    documentId: 'DOC-2026-001',
    versionNumber: 1,
    encryptAtRest: true
  });

  const block1 = LedgerService.createBlock({
    eventType: 'DOCUMENT_VERSION_CREATED',
    resourceType: 'DOCUMENT',
    resourceId: 'DOC-2026-001',
    resourceHash: doc1Save.sha256Hash,
    actorId: 'USR-IO-01',
    actorName: 'Inspector Rajesh Verma',
    payload: {
      documentNumber: 'DOC-2026-1001',
      versionNumber: 1,
      caseNumber: case1.caseNumber,
      category: 'FIR',
      confidentiality: 'Confidential'
    }
  });

  db.document_versions.push({
    id: 'VER-2026-001',
    documentId: 'DOC-2026-001',
    versionNumber: 1,
    fileName: 'FIR_2026_CRB_101_Formal_Filing.pdf',
    storedFileName: doc1Save.storedFileName,
    mimeType: 'application/pdf',
    fileSizeBytes: sampleDoc1Content.length,
    sha256Hash: doc1Save.sha256Hash,
    uploadedBy: 'USR-IO-01',
    uploaderName: 'Inspector Rajesh Verma',
    uploaderRole: 'investigating_officer',
    changeSummary: 'Original FIR registered with stamp and seal.',
    isEncrypted: true,
    encryptionKeyId: doc1Save.encryptionKeyId,
    malwareScanStatus: 'CLEAN',
    createdAt: '2026-08-15T09:15:00Z',
    ledgerBlockId: block1.blockHash
  });

  db.documents.push({
    id: 'DOC-2026-001',
    documentNumber: 'DOC-2026-1001',
    caseId: case1.id,
    caseNumber: case1.caseNumber,
    title: 'Formal First Information Report (FIR No. 101/2026)',
    category: 'FIR',
    description: 'Registered formal FIR document with jurisdictional Magistrate endorsement.',
    authorId: 'USR-IO-01',
    authorName: 'Inspector Rajesh Verma',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Confidential',
    currentVersionNumber: 1,
    reviewStatus: 'Approved',
    isLegalHold: true,
    isDeleted: false,
    retentionUntil: '2036-08-15T00:00:00Z',
    tags: ['FIR', 'Cyber Fraud', 'Escrow Diversion', 'IPC 420'],
    createdAt: '2026-08-15T09:15:00Z',
    updatedAt: '2026-08-16T11:00:00Z'
  });

  AIService.analyzeDocument('DOC-2026-001', sampleDoc1Content.toString('utf-8'), 'FIR_2026_CRB_101_Formal_Filing.pdf');

  // Seed Forensic Report Doc for Case 2
  const sampleBallisticContent = Buffer.from(`CENTRAL FORENSIC SCIENCE LABORATORY (CFSL)
BALLISTICS DIVISION REPORT
Report Reference: CFSL/DEL/BAL/2026/0882
Date: 18/08/2026

Case: FIR-2026-CRB-102 (Hauz Khas Armed Robbery)
Examining Officer: Dr. Ramesh Rao, Senior Forensic Scientist

Exhibit 1: One 9mm Calibre Country-Made Semi-Automatic Pistol (Serial: WB-8819 marked)
Exhibit 2: One Fired 9mm Brass Cartridge Case recovered from floor of Commercial Arcade
Exhibit 3: One Deformed Copper-Jacketed Bullet recovered from wall pillar

Findings:
1. Microscopic comparison of firing pin indentations and breech face marks confirms Exhibit 2 cartridge case was fired from Exhibit 1 firearm to a 99.8% degree of certainty.
2. Striation grooves on Exhibit 3 bullet match barrel lands of Exhibit 1.
3. Weapon was found in fully operable firing condition.

Conclusion:
Positive ballistic match established under Arms Act Section 25 & 27 / IPC 307.`, 'utf-8');

  const doc2Save = await StorageService.saveFile({
    buffer: sampleBallisticContent,
    originalFileName: 'CFSL_Ballistic_Examination_Report_0882.pdf',
    mimeType: 'application/pdf',
    documentId: 'DOC-2026-002',
    versionNumber: 1,
    encryptAtRest: true
  });

  const block2 = LedgerService.createBlock({
    eventType: 'DOCUMENT_VERSION_CREATED',
    resourceType: 'DOCUMENT',
    resourceId: 'DOC-2026-002',
    resourceHash: doc2Save.sha256Hash,
    actorId: 'USR-FOR-01',
    actorName: 'Dr. Ramesh Rao',
    payload: {
      documentNumber: 'DOC-2026-1002',
      versionNumber: 1,
      caseNumber: case2.caseNumber,
      category: 'Forensic Report',
      confidentiality: 'Secret'
    }
  });

  db.document_versions.push({
    id: 'VER-2026-002',
    documentId: 'DOC-2026-002',
    versionNumber: 1,
    fileName: 'CFSL_Ballistic_Examination_Report_0882.pdf',
    storedFileName: doc2Save.storedFileName,
    mimeType: 'application/pdf',
    fileSizeBytes: sampleBallisticContent.length,
    sha256Hash: doc2Save.sha256Hash,
    uploadedBy: 'USR-FOR-01',
    uploaderName: 'Dr. Ramesh Rao',
    uploaderRole: 'forensic_officer',
    changeSummary: 'Official CFSL Ballistic match findings signed by Dr. Ramesh Rao.',
    isEncrypted: true,
    encryptionKeyId: doc2Save.encryptionKeyId,
    malwareScanStatus: 'CLEAN',
    createdAt: '2026-08-18T14:00:00Z',
    ledgerBlockId: block2.blockHash
  });

  db.documents.push({
    id: 'DOC-2026-002',
    documentNumber: 'DOC-2026-1002',
    caseId: case2.id,
    caseNumber: case2.caseNumber,
    title: 'CFSL Ballistic Laboratory Examination Report No. 0882',
    category: 'Forensic Report',
    description: 'Conclusive forensic ballistic match report tying recovered 9mm firearm to crime scene cartridge casing.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Central Forensic Science Laboratory (CFSL)',
    confidentiality: 'Secret',
    currentVersionNumber: 1,
    reviewStatus: 'Signed',
    isLegalHold: true,
    isDeleted: false,
    retentionUntil: '2046-08-18T00:00:00Z',
    tags: ['Forensic', 'Ballistics', 'CFSL', 'Arms Act', '9mm'],
    createdAt: '2026-08-18T14:00:00Z',
    updatedAt: '2026-08-19T10:00:00Z'
  });

  AIService.analyzeDocument('DOC-2026-002', sampleBallisticContent.toString('utf-8'), 'CFSL_Ballistic_Examination_Report_0882.pdf');

  // Digital Signature for Doc 2
  const sigDigest = `${doc2Save.sha256Hash}:USR-FOR-01:CFSL-EXP-82:1:2026-08-19T10:00:00Z`;
  const signatureVal = CryptoService.signData(sigDigest, db.user_private_keys['USR-FOR-01']);

  const sigBlock = LedgerService.createBlock({
    eventType: 'DOCUMENT_DIGITALLY_SIGNED',
    resourceType: 'DOCUMENT',
    resourceId: 'DOC-2026-002',
    resourceHash: doc2Save.sha256Hash,
    actorId: 'USR-FOR-01',
    actorName: 'Dr. Ramesh Rao',
    payload: {
      signatureId: 'SIG-2026-001',
      documentNumber: 'DOC-2026-1002',
      signerRole: 'forensic_officer'
    }
  });

  db.digital_signatures.push({
    id: 'SIG-2026-001',
    documentId: 'DOC-2026-002',
    versionNumber: 1,
    versionHash: doc2Save.sha256Hash,
    signerId: 'USR-FOR-01',
    signerName: 'Dr. Ramesh Rao',
    signerRole: 'forensic_officer',
    signerAgencyId: 'CFSL-EXP-82',
    signatureTimestamp: '2026-08-19T10:00:00Z',
    signatureAlgorithm: 'RSA-SHA256 (PKCS#1 v1.5)',
    signatureValue: signatureVal,
    publicKeyCertificate: db.users.find(u => u.id === 'USR-FOR-01')?.publicKey || '',
    verificationStatus: 'VALID',
    verifiedAt: '2026-08-19T10:00:00Z',
    ledgerBlockId: sigBlock.blockHash
  });

  // Helper for seeding additional authentic legal and forensic documents
  const seedDocHelper = async (params: {
    id: string;
    docNumber: string;
    caseItem: Case;
    title: string;
    category: DocumentCategory;
    description: string;
    authorId: string;
    authorName: string;
    department: string;
    confidentiality: ConfidentialityLevel;
    reviewStatus: ReviewStatus;
    fileName: string;
    content: string;
    tags: string[];
    createdAt: string;
    signedBy?: {
      userId: string;
      signerName: string;
      signerRole: string;
      signerAgencyId: string;
      signatureId: string;
    };
  }) => {
    const buffer = Buffer.from(params.content, 'utf-8');
    const saveResult = await StorageService.saveFile({
      buffer,
      originalFileName: params.fileName,
      mimeType: 'application/pdf',
      documentId: params.id,
      versionNumber: 1,
      encryptAtRest: true
    });

    const block = LedgerService.createBlock({
      eventType: 'DOCUMENT_VERSION_CREATED',
      resourceType: 'DOCUMENT',
      resourceId: params.id,
      resourceHash: saveResult.sha256Hash,
      actorId: params.authorId,
      actorName: params.authorName,
      payload: {
        documentNumber: params.docNumber,
        versionNumber: 1,
        caseNumber: params.caseItem.caseNumber,
        category: params.category,
        confidentiality: params.confidentiality
      }
    });

    const numSuffix = params.id.replace('DOC-2026-', '');
    db.document_versions.push({
      id: `VER-2026-${numSuffix}`,
      documentId: params.id,
      versionNumber: 1,
      fileName: params.fileName,
      storedFileName: saveResult.storedFileName,
      mimeType: 'application/pdf',
      fileSizeBytes: buffer.length,
      sha256Hash: saveResult.sha256Hash,
      uploadedBy: params.authorId,
      uploaderName: params.authorName,
      uploaderRole: (db.users.find(u => u.id === params.authorId)?.role || 'investigating_officer') as any,
      changeSummary: `${params.category} official authenticated filing for ${params.caseItem.caseNumber}.`,
      isEncrypted: true,
      encryptionKeyId: saveResult.encryptionKeyId,
      malwareScanStatus: 'CLEAN',
      createdAt: params.createdAt,
      ledgerBlockId: block.blockHash
    });

    db.documents.push({
      id: params.id,
      documentNumber: params.docNumber,
      caseId: params.caseItem.id,
      caseNumber: params.caseItem.caseNumber,
      title: params.title,
      category: params.category,
      description: params.description,
      authorId: params.authorId,
      authorName: params.authorName,
      department: params.department,
      confidentiality: params.confidentiality,
      currentVersionNumber: 1,
      reviewStatus: params.reviewStatus,
      isLegalHold: true,
      isDeleted: false,
      retentionUntil: '2036-08-20T00:00:00Z',
      tags: params.tags,
      createdAt: params.createdAt,
      updatedAt: params.createdAt
    });

    AIService.analyzeDocument(params.id, params.content, params.fileName);

    if (params.signedBy) {
      const sigDigest = `${saveResult.sha256Hash}:${params.signedBy.userId}:${params.signedBy.signerAgencyId}:1:${params.createdAt}`;
      const signatureVal = CryptoService.signData(sigDigest, db.user_private_keys[params.signedBy.userId]);

      const sigBlock = LedgerService.createBlock({
        eventType: 'DOCUMENT_DIGITALLY_SIGNED',
        resourceType: 'DOCUMENT',
        resourceId: params.id,
        resourceHash: saveResult.sha256Hash,
        actorId: params.signedBy.userId,
        actorName: params.signedBy.signerName,
        payload: {
          signatureId: params.signedBy.signatureId,
          documentNumber: params.docNumber,
          signerRole: params.signedBy.signerRole
        }
      });

      db.digital_signatures.push({
        id: params.signedBy.signatureId,
        documentId: params.id,
        versionNumber: 1,
        versionHash: saveResult.sha256Hash,
        signerId: params.signedBy.userId,
        signerName: params.signedBy.signerName,
        signerRole: params.signedBy.signerRole as any,
        signerAgencyId: params.signedBy.signerAgencyId,
        signatureTimestamp: params.createdAt,
        signatureAlgorithm: 'RSA-SHA256 (PKCS#1 v1.5)',
        signatureValue: signatureVal,
        publicKeyCertificate: db.users.find(u => u.id === params.signedBy?.userId)?.publicKey || '',
        verificationStatus: 'VALID',
        verifiedAt: params.createdAt,
        ledgerBlockId: sigBlock.blockHash
      });
    }
  };

  // Case 1: Judicial Escrow Freeze Order (DOC-2026-003)
  await seedDocHelper({
    id: 'DOC-2026-003',
    docNumber: 'DOC-2026-1003',
    caseItem: case1,
    title: 'Judicial Bank Escrow Account Freeze Order u/s 102 CrPC / Sec 106 BNSS',
    category: 'Court Filing',
    description: 'Judicial warrant and statutory freeze order served on State Bank of India preventing dissipation of ₹4.2 Crore proceeds of cyber fraud.',
    authorId: 'USR-IO-01',
    authorName: 'Inspector Rajesh Verma',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Confidential',
    reviewStatus: 'Signed',
    fileName: 'Court_Order_Sec102_Escrow_Account_Freeze.pdf',
    content: `IN THE COURT OF CHIEF METROPOLITAN MAGISTRATE, SAKET COURTS, NEW DELHI
CRIMINAL MISC APPLICATION NO. 881/2026
IN RE: FIR NO. 101/2026 PS CRIME BRANCH (DWARKA CYBER ESCROW FRAUD)

ORDER UNDER SECTION 102 Cr.P.C. / SECTION 106 BNSS, 2023

1. An application has been filed by IO Insp. Rajesh Verma seeking freezing of Corporate Escrow Account No. 90182819 maintained with State Bank of India, Commercial Branch, New Delhi.
2. It appears that an aggregate sum of ₹4,20,00,000/- was fraudulently diverted from victim corporate account through compromised API keys and SIM-swap replay.
3. In view of the emergent threat of offshore dissipation, Branch Manager, State Bank of India is hereby DIRECTED to immediately FREEZE the credit and debit operations in Account No. 90182819.
4. Compliance report shall be submitted within 24 hours.

GIVEN UNDER MY HAND AND SEAL OF THE COURT.
Hon. Justice Manpreet Kaur, DHJS`,
    tags: ['Freeze Order', 'Sec 102 CrPC', 'SBI Escrow', 'Judicial Warrant'],
    createdAt: '2026-08-16T15:00:00Z',
    signedBy: {
      userId: 'USR-JUDGE-01',
      signerName: 'Hon. Justice Manpreet Kaur',
      signerRole: 'judge',
      signerAgencyId: 'DHJS-771',
      signatureId: 'SIG-2026-002'
    }
  });

  // Case 1: Forensic IP Hop & Replay Audit (DOC-2026-004)
  await seedDocHelper({
    id: 'DOC-2026-004',
    docNumber: 'DOC-2026-1004',
    caseItem: case1,
    title: 'Forensic Session Token Replay & IP Hop Audit Report',
    category: 'Forensic Report',
    description: 'CFSL Cyber Lab examination of reverse proxy logs, TLS fingerprint hashes, and authentication session token replay.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Ballistics & Digital Forensics',
    confidentiality: 'Secret',
    reviewStatus: 'Approved',
    fileName: 'CFSL_Cyber_Session_Replay_Forensics.pdf',
    content: `CENTRAL FORENSIC SCIENCE LABORATORY (CFSL) - CYBER DIVISION
REPORT ON DIGITAL REVERSE PROXY LOGS & API TOKEN REPLAY
Reference: CFSL/CYB/2026/0442
Case: FIR-2026-CRB-101 (Dwarka Cyber Escrow Phishing)

1. Server ingress logs from 14/08/2026 21:28:10 IST to 21:34:22 IST were forensically extracted from AWS CloudTrail and Nginx reverse proxies.
2. Ingress request carrying bearer token originates from IP 185.220.101.5 (known Tor exit node) with user-agent mimicking Chrome 127.
3. TLS JA3 fingerprint matches Python Requests script, confirming automated programmatic replay rather than human browser session.
4. Two-factor SMS OTP was intercepted via unauthorized SIM swap executed at telecom partner kiosk in Salt Lake, Kolkata.`,
    tags: ['Cyber Forensics', 'Session Replay', 'Tor Exit Node', 'JA3 Hash'],
    createdAt: '2026-08-17T11:30:00Z'
  });

  // Case 2: Crime Scene Panchnama (DOC-2026-005)
  await seedDocHelper({
    id: 'DOC-2026-005',
    docNumber: 'DOC-2026-1005',
    caseItem: case2,
    title: 'Crime Scene Panchnama & Seizure Memo (Hauz Khas Heist)',
    category: 'Police Report',
    description: 'Formal recovery memo and panchnama drawn at Commercial Arcade Hauz Khas in presence of independent witnesses.',
    authorId: 'USR-IO-01',
    authorName: 'Inspector Rajesh Verma',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Confidential',
    reviewStatus: 'Approved',
    fileName: 'Crime_Scene_Panchnama_HauzKhas_Seizure.pdf',
    content: `MEMORANDUM OF SEIZURE (PANCHNAMA)
Under Section 100 Cr.P.C. / Section 105 BNSS, 2023
Police Station: Hauz Khas Crime Branch, New Delhi
Date & Time: 02/08/2026 22:30 Hrs
Place of Recovery: Sector 3 Commercial Arcade Back Alley, Hauz Khas, New Delhi

Panch Witnesses:
1. Shri Naresh Goyal, Shopkeeper, Shop 14, Hauz Khas Market.
2. Shri Anand Prakash, Security Guard, Hauz Khas Commercial Complex.

Recoveries Seized:
1. One Country-Made 9mm Semi-Automatic Pistol (WB-8819) with one magazine and 3 live rounds.
2. One fired 9mm brass cartridge case recovered from floor near Pillar B.
3. One discarded helmet and black cotton gloves.

The articles were packed in tamper-evident forensic evidence bag and sealed with seal of 'DP-CB-4421'.`,
    tags: ['Panchnama', 'Arms Seizure', 'Hauz Khas', 'Sec 100 CrPC'],
    createdAt: '2026-08-03T01:00:00Z'
  });

  // Case 3: FIR No. 103/2026 (DOC-2026-006)
  await seedDocHelper({
    id: 'DOC-2026-006',
    docNumber: 'DOC-2026-1006',
    caseItem: case3,
    title: 'First Information Report (FIR No. 103/2026 - Cyber Extortion)',
    category: 'FIR',
    description: 'Formal First Information Report registered for deepfake synthetic video blackmail and private cloud identity theft.',
    authorId: 'USR-IO-01',
    authorName: 'Inspector Rajesh Verma',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Confidential',
    reviewStatus: 'Approved',
    fileName: 'FIR_2026_VK_103_Cyber_Extortion_Deepfake.pdf',
    content: `FIRST INFORMATION REPORT (FIR)
Under Section 154 Cr.P.C. / BNSS Section 173
Police Station: Vasant Kunj North PS, South-West District, New Delhi
FIR No: FIR-2026-VK-103
Date of Report: 10/08/2026 11:30 Hrs

Complainant: Dr. Ananya Sengupta, Associate Professor, JNU New Delhi.
Accused: Unknown cyber blackmailers operating via Telegram Handle '@ghost_nexus99'.

Sections Invoked:
- Bharatiya Nyaya Sanhita (BNS) Sections 78, 79, 308(2) [Stalking, Insulting Modesty, Extortion]
- Information Technology Act Sections 66E, 67A [Privacy Violation, Transmitting Sexually Explicit Material]

Gist of Complaint:
Complainant reported receiving Telegram messages demanding ₹15,00,000/- accompanied by hyper-realistic synthetic deepfake video clips generated using complainant's public faculty profile images. Threat issued that video would be circulated to academic faculty lists if payment in USDT is not transferred within 48 hours.`,
    tags: ['FIR', 'Deepfake', 'Extortion', 'IT Act 67A', 'BNS 308(2)'],
    createdAt: '2026-08-10T11:45:00Z'
  });

  // Case 3: CFSL Deepfake Attribution Report (DOC-2026-007)
  await seedDocHelper({
    id: 'DOC-2026-007',
    docNumber: 'DOC-2026-1007',
    caseItem: case3,
    title: 'CFSL Forensic Synthetic Deepfake Audio/Video Attribution Report',
    category: 'Forensic Report',
    description: 'Conclusive CFSL examination verifying synthetic neural facial generation and phoneme-lip discrepancy.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Ballistics & Digital Forensics',
    confidentiality: 'Secret',
    reviewStatus: 'Signed',
    fileName: 'CFSL_Deepfake_Audio_Video_Attribution_Report.pdf',
    content: `CENTRAL FORENSIC SCIENCE LABORATORY (CFSL)
DIGITAL EVIDENCE & MULTIMEDIA FORENSICS DIVISION
Report No: CFSL/DEL/MM/2026/0119
Date: 14/08/2026

Sub: Examination of questioned MP4 video exhibit 'evidence_vid_clip01.mp4' in FIR-2026-VK-103.
Examiner: Dr. Ramesh Rao, Senior Forensic Scientist (Digital Forensics)

Findings:
1. Frame-by-frame Fourier frequency analysis reveals artificial checkerboard boundary artifacts around facial contour, characteristic of GAN (Generative Adversarial Network) latent diffusion models.
2. Audio-visual temporal phoneme synchronization displays a 142ms lag between vowel acoustic envelope and buccal opening.
3. Residual metadata tags in MP4 container reveal render engine signatures of open-source Roop/FaceFusion pipeline.
Conclusion:
The questioned video is a digitally synthesized deepfake containing manipulated facial imagery not originating from authentic biological recording.`,
    tags: ['Forensic', 'Deepfake', 'CFSL', 'FaceFusion', 'Multimedia'],
    createdAt: '2026-08-14T16:00:00Z',
    signedBy: {
      userId: 'USR-FOR-01',
      signerName: 'Dr. Ramesh Rao',
      signerRole: 'forensic_officer',
      signerAgencyId: 'CFSL-EXP-82',
      signatureId: 'SIG-2026-003'
    }
  });

  // Case 3: Section 65B Electronic Certificate (DOC-2026-008)
  await seedDocHelper({
    id: 'DOC-2026-008',
    docNumber: 'DOC-2026-1008',
    caseItem: case3,
    title: 'Section 65B Indian Evidence Act Certificate (Electronic Admissibility)',
    category: 'Court Filing',
    description: 'Mandatory certificate under Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam validating hash proofs.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Ballistics & Digital Forensics',
    confidentiality: 'Confidential',
    reviewStatus: 'Signed',
    fileName: 'Section_65B_IEA_Certificate_iCloud_Extraction.pdf',
    content: `CERTIFICATE UNDER SECTION 65B OF THE INDIAN EVIDENCE ACT, 1872
(READ WITH SECTION 63 OF BHARATIYA SAKSHYA ADHINIYAM, 2023)

I, Dr. Ramesh Rao, Senior Forensic Scientist, CFSL CBI Campus, New Delhi, do hereby certify:
1. I had lawful physical and electronic control over the Cellebrite Forensic Workstation (CLB-UFED-99210) during the acquisition and analysis of electronic records in FIR-2026-VK-103.
2. The electronic exhibits, comprising iPhone 14 logical image (SHA-256: 8f2c3182a9010bcdef412891901a) and Telegram chat extraction databases, were generated during the ordinary course of lawful forensic examination.
3. Throughout the material period, the computer output and imaging processes operated properly with zero transmission error or bit manipulation.
4. The output produced faithfully reproduces the electronic record stored on the primary exhibit.

GIVEN UNDER MY OFFICIAL DIGITAL SEAL.
Dr. Ramesh Rao (CFSL / CBI)`,
    tags: ['Section 65B', 'BSA 2023', 'Admissibility', 'Electronic Proof'],
    createdAt: '2026-08-15T10:00:00Z',
    signedBy: {
      userId: 'USR-FOR-01',
      signerName: 'Dr. Ramesh Rao',
      signerRole: 'forensic_officer',
      signerAgencyId: 'CFSL-EXP-82',
      signatureId: 'SIG-2026-004'
    }
  });

  // Case 4: ED-STF Hawala Seizure Directive (DOC-2026-009)
  await seedDocHelper({
    id: 'DOC-2026-009',
    docNumber: 'DOC-2026-1009',
    caseItem: case4,
    title: 'ED-STF Joint Hawala Seizure Notice & Account Freezing Directive',
    category: 'Police Report',
    description: 'Inter-agency communication freezing 14 mule accounts with cumulative balance of ₹11.8 Crore in crypto laundering probe.',
    authorId: 'USR-SUP-01',
    authorName: 'ACP Sunita Mehta',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Secret',
    reviewStatus: 'Approved',
    fileName: 'ED_STF_Joint_Hawala_Seizure_Notice.pdf',
    content: `GOVERNMENT OF INDIA - SPECIAL TASK FORCE & ENFORCEMENT DIRECTORATE
JOINT OPERATIONS COMMUNIQUE - HAWALA & CRYPTO OFF-RAMP SEIZURE
Memo Ref: ED/DL/PMLA/2026/0991
Dated: 16/08/2026

To:
General Managers - Compliance & Anti-Money Laundering
HDFC Bank, ICICI Bank, Axis Bank

Sub: Freezing of 14 Mule Accounts associated with Amitav Roy & Shaukat Ali Syndicate.

Pursuant to powers vested under PMLA 2002 and Section 102 CrPC:
1. You are directed to effect instantaneous debit freeze across all 14 attached bank accounts.
2. The accounts received ₹11.8 Crore originating from USDT liquidation on P2P desks in Lajpat Nagar within a 72-hour window.
3. KYC documents, IP login logs, and ATM withdrawal CCTV footage must be furnished within 48 hours.

ACP Sunita Mehta (Delhi Police Crime Branch) & Joint Director (ED Delhi Zonal)`,
    tags: ['Hawala', 'PMLA', 'Crypto Mule', 'Account Freeze'],
    createdAt: '2026-08-16T17:00:00Z'
  });

  // Case 4: Crypto Flow Forensics (DOC-2026-010)
  await seedDocHelper({
    id: 'DOC-2026-010',
    docNumber: 'DOC-2026-1010',
    caseItem: case4,
    title: 'TRON Blockchain USDT On-Chain Hop Forensic Analysis',
    category: 'Forensic Report',
    description: 'On-chain flow visualization and cluster analysis tracing 4-hop wash trading through decentralized liquidity pools.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Ballistics & Digital Forensics',
    confidentiality: 'Confidential',
    reviewStatus: 'Approved',
    fileName: 'TRON_Blockchain_USDT_Mule_Cluster_Analysis.pdf',
    content: `CFSL DIGITAL ASSETS TRACING WING
BLOCKCHAIN TRANSACTION TRACE REPORT - TRON (TRC-20 USDT)
Case: FIR-2026-LN-104 (Lajpat Nagar Hawala Syndicate)

1. Originating Wallet: TXx901928...4819a (Seized Ledger Nano X hardware wallet).
2. Total Volume Traced: 1,420,000 USDT ($1.42M USD ~ ₹11.85 Crore INR).
3. Transaction Path:
   - Hop 1: Wallet TXx901928 sent 5 tranches of 284,000 USDT to automated smart contract router SunSwap.
   - Hop 2: Dispersed into 48 unhosted micro-wallets in batches of < 30,000 USDT each.
   - Hop 3: Consolidated at Binance P2P Merchant Escrow Deposit Address TD8812...0189.
4. Indian INR counterparty payments deposited into 14 dummy current accounts identified in Lajpat Nagar.`,
    tags: ['Blockchain', 'TRON', 'USDT', 'Crypto Forensics'],
    createdAt: '2026-08-17T18:00:00Z'
  });

  // Case 5: Gold Jewellery Invoice & Panchnama (DOC-2026-011)
  await seedDocHelper({
    id: 'DOC-2026-011',
    docNumber: 'DOC-2026-1011',
    caseItem: case5,
    title: 'Gold Jewellery Purchase Invoice & Recovery Panchnama',
    category: 'Evidence Record',
    description: 'Original retail purchase invoice and recovery panchnama for 22K hallmark gold necklace snapped at Central Market.',
    authorId: 'USR-IO-01',
    authorName: 'Inspector Rajesh Verma',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Confidential',
    reviewStatus: 'Approved',
    fileName: 'Gold_Jewellery_Panchnama_Recovery_Memo.pdf',
    content: `MEMORANDUM OF RECOVERY & ARTICLE VERIFICATION
PS Lajpat Nagar / Crime Branch
Case: FIR-2026-LN-105 (Central Market Daylight Snatching)

Item Description:
- 22 Karat Yellow Gold Choker Necklace with floral filigree motif.
- Weight: 24.60 grams (verified on calibrated electronic balance).
- Hallmark Stamp: BIS Hallmark 916 / Jeweller Mark 'TNK-DEL'.
- Condition: Clasp sheared off with strain marks indicating violent physical pulling.

Complainant Shrimati Meenakshi Sundaram positively identified the item by matching purchase Invoice #TNK-2023-8810 issued on Dhanteras 2023.`,
    tags: ['Gold Snatching', 'Panchnama', 'BIS Hallmark', 'Lajpat Nagar'],
    createdAt: '2026-08-14T14:00:00Z'
  });

  // Case 5: CCTV Geometric Correlation (DOC-2026-012)
  await seedDocHelper({
    id: 'DOC-2026-012',
    docNumber: 'DOC-2026-1012',
    caseItem: case5,
    title: 'CCTV Geometric Angle & Facial Recognition Correlation Memo',
    category: 'Forensic Report',
    description: 'Central Market municipal CCTV surveillance analysis correlating suspect motorcycle license plate and trajectory.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Ballistics & Digital Forensics',
    confidentiality: 'Confidential',
    reviewStatus: 'Approved',
    fileName: 'CCTV_Facial_Recognition_Geometric_Correlation_LN.pdf',
    content: `DELHI POLICE SPECIAL SURVEILLANCE & AI LAB
CCTV GEOMETRIC RECONSTRUCTION & VEHICLE IDENTIFICATION
FIR-2026-LN-105 (Central Market Snatching)

1. 4 CCTV camera viewpoints (Pole 4, Pole 7, Shop 22, Central Bank ATM) were calibrated for perspective distortion.
2. At 17:42:09 IST, a Black Bajaj Pulsar 220 entered Ring Road service lane at 62 km/h.
3. Optical character recognition enhancement on rear registration plate confirmed plate string 'DL-3S-CQ-4102'.
4. Pillion rider clothing matches suspect Irfan Khan alias Cheeta: black hoodie with white logo, red sports shoes.`,
    tags: ['CCTV', 'OCR', 'Vehicle Tracking', 'Lajpat Nagar'],
    createdAt: '2026-08-15T12:00:00Z'
  });

  // Case 6: Ballistics Report .32 Bore (DOC-2026-013)
  await seedDocHelper({
    id: 'DOC-2026-013',
    docNumber: 'DOC-2026-1013',
    caseItem: case6,
    title: 'CFSL Ballistics Comparison Report (.32 Bore Cartridges)',
    category: 'Forensic Report',
    description: 'Conclusive CFSL ballistics comparison matching spent cartridges from sweet house shootout to seized .32 pistol.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Ballistics & Digital Forensics',
    confidentiality: 'Secret',
    reviewStatus: 'Signed',
    fileName: 'CFSL_Ballistics_Comparison_Report_32_Bore.pdf',
    content: `CENTRAL FORENSIC SCIENCE LABORATORY (CFSL)
BALLISTICS DIVISION - COMPARISON EXAMINATION REPORT
Report Reference: CFSL/DEL/BAL/2026/0904
Case: FIR-2026-ROH-106 (Rohini Sector 7 Armed Extortion & Shootout)

Exhibits:
- Exhibit A: One .32 Bore Country-made Semi-Automatic Pistol recovered from accused Deepak Rana.
- Exhibit B1, B2: Two fired .32 brass cartridge cases recovered from Aggarwal Sweet House floor.

Observations:
Comparison microscope examination at 40x magnification reveals identical chamber tool marks and firing pin hemispherical indentation profiles between test-fired cartridge from Exhibit A and crime scene Exhibits B1/B2.

Conclusion:
Exhibits B1 and B2 were fired from the firearm Exhibit A to a degree of scientific certainty exceeding 99.9%.`,
    tags: ['CFSL', 'Ballistics', '.32 Bore', 'Rohini Shootout', 'Arms Act'],
    createdAt: '2026-08-20T16:00:00Z',
    signedBy: {
      userId: 'USR-FOR-01',
      signerName: 'Dr. Ramesh Rao',
      signerRole: 'forensic_officer',
      signerAgencyId: 'CFSL-EXP-82',
      signatureId: 'SIG-2026-005'
    }
  });

  // Case 6: Accused Interrogation Statement (DOC-2026-014)
  await seedDocHelper({
    id: 'DOC-2026-014',
    docNumber: 'DOC-2026-1014',
    caseItem: case6,
    title: 'Accused Deepak Rana Interrogation Statement u/s 23 BNSS',
    category: 'Witness Statement',
    description: 'Custodial interrogation disclosure statement recorded under Section 23 BNSS disclosing weapons cache.',
    authorId: 'USR-IO-01',
    authorName: 'Inspector Rajesh Verma',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Confidential',
    reviewStatus: 'Approved',
    fileName: 'Accused_Interrogation_Statement_Deepak_Rana.pdf',
    content: `DISCLOSURE STATEMENT OF ACCUSED DEEPAK RANA
Recorded Under Section 23 BNSS, 2023
Date: 20/08/2026 | Place: Rohini Special Staff Office

I, Deepak Rana, S/o Virender Rana, R/o Village Kanjhawala, state as under:
"On 18-Aug-2026, Monu Bawana called me over Signal app and instructed me to fire shots outside Aggarwal Sweets in Rohini Sector 7 to create terror for payment of ₹25 Lakhs extortion money. He provided the .32 pistol through an intermediary near Rithala Metro Station. After firing 2 shots in the air, I fled on my Pulsar bike and concealed the weapon behind the transformer in Pocket 4."`,
    tags: ['Interrogation', 'BNSS Sec 23', 'Extortion', 'Rohini'],
    createdAt: '2026-08-21T10:00:00Z'
  });

  // Case 7: Chassis Etching Restoration Report (DOC-2026-015)
  await seedDocHelper({
    id: 'DOC-2026-015',
    docNumber: 'DOC-2026-1015',
    caseItem: case7,
    title: 'Chassis Chemical Etching & Restoration Examination Report',
    category: 'Forensic Report',
    description: 'Metallurgical acid etching procedure restoring obliterated chassis stamping on recovered Hyundai Creta.',
    authorId: 'USR-FOR-01',
    authorName: 'Dr. Ramesh Rao',
    department: 'Ballistics & Digital Forensics',
    confidentiality: 'Secret',
    reviewStatus: 'Approved',
    fileName: 'Chassis_Chemical_Etching_Restoration_Report.pdf',
    content: `CFSL PHYSICAL SCIENCES & METALLURGY DIVISION
CHEMICAL RESTORATION OF OBLITERATED SERIAL NUMBER
Report: CFSL/MET/2026/0291
Case: FIR-2026-KB-107 (Karol Bagh Auto Lifting Nexus)

Vehicle: White Hyundai Creta
Questioned Area: Firewall Chassis Plate bearing mechanical grinding marks.

Method:
Surfaces were degreased with acetone, followed by sequential application of Villella's Etching Reagent (picric acid + hydrochloric acid + ethanol).

Results:
The compressed crystal grain structure beneath the mechanically erased stamp was successfully etched.
Original Manufacturer VIN Restored: MALC381CLPM901828.
Cross-referenced with VAHAN national portal: Vehicle belongs to complainant Gaurav Chawla.`,
    tags: ['CFSL', 'Metallurgy', 'Chemical Etching', 'Auto Theft', 'VAHAN'],
    createdAt: '2026-08-16T14:00:00Z'
  });

  // Case 7: Counterfeit Smart RC Seizure (DOC-2026-016)
  await seedDocHelper({
    id: 'DOC-2026-016',
    docNumber: 'DOC-2026-1016',
    caseItem: case7,
    title: 'Counterfeit Smart RC & Electronic Key Scanner Seizure Memo',
    category: 'Police Report',
    description: 'Seizure of OBD-II frequency scanners, blank optical smart cards, and counterfeit transport authority holographic foils.',
    authorId: 'USR-IO-01',
    authorName: 'Inspector Rajesh Verma',
    department: 'Crime Branch Special Cell',
    confidentiality: 'Confidential',
    reviewStatus: 'Approved',
    fileName: 'Counterfeit_Smart_RC_Scanner_Seizure_Memo.pdf',
    content: `RECOVERY MEMORANDUM - AUTO THEFT SQUAD (AATS)
Police Station: Karol Bagh PS
Date: 14/08/2026 18:30 Hrs

Articles Recovered from Workshop Godown at Naiwala, Karol Bagh:
1. One Autel MaxiIM IM608 Pro II OBD-II Key Programming Tablet Scanner.
2. One 8-antenna handheld GPS & GSM signal jammer (Model TX-101).
3. 24 blank optical chip Smart Cards with counterfeit Delhi Transport Department emblems.
4. One roll of counterfeit high-security registration plate (HSRP) hologram foils.`,
    tags: ['AATS', 'Key Programmer', 'GPS Jammer', 'Counterfeit RC'],
    createdAt: '2026-08-15T09:00:00Z'
  });

  // 4. Seed Evidence Items & Custody Chains
  const ev1Id = 'EVD-2026-001';
  const ev1Hash = CryptoService.sha256(`EVD-2026-001:Ballistic:Country-made 9mm Semi-Automatic Pistol recovered under panchnama`);

  db.evidence_items.push({
    id: ev1Id,
    evidenceNumber: 'EVD-2026-101',
    caseId: case2.id,
    caseNumber: case2.caseNumber,
    type: 'Ballistic',
    description: 'Country-made 9mm Semi-Automatic Pistol (WB-8819) with one magazine and 3 live rounds seized from accused possession.',
    collectionLocation: 'Sector 3 Commercial Arcade Back Alley, Hauz Khas',
    collectionTimestamp: '2026-08-02T22:45:00Z',
    collectorId: 'USR-IO-01',
    collectorName: 'Inspector Rajesh Verma',
    storageLocker: 'CFSL Ballistics Secure Evidence Vault #4',
    currentCustodian: 'Dr. Ramesh Rao (Senior Forensic Scientist)',
    currentCustodianRole: 'forensic_officer',
    handlingNotes: 'Strict firearm safety observed. Kept in tamper-evident sealed evidence bag #DEL-EVD-9912.',
    sha256Hash: ev1Hash,
    linkedDocumentIds: ['DOC-2026-002', 'DOC-2026-005'],
    isLocked: true,
    createdAt: '2026-08-03T00:30:00Z',
    updatedAt: '2026-08-05T14:00:00Z'
  });

  db.custody_events.push(
    {
      id: 'CUST-001',
      evidenceId: ev1Id,
      eventType: 'COLLECTION',
      actorId: 'USR-IO-01',
      actorName: 'Inspector Rajesh Verma',
      actorRole: 'investigating_officer',
      fromCustodian: 'Crime Scene Hauz Khas',
      toCustodian: 'Inspector Rajesh Verma (Crime Branch)',
      location: 'Hauz Khas Crime Branch Malkhana',
      timestamp: '2026-08-02T23:00:00Z',
      reason: 'Physical recovery and panchnama seizure',
      acknowledgedByDestination: true,
      acknowledgedAt: '2026-08-02T23:00:00Z',
      hashProof: CryptoService.sha256('CUSTODY_1_HASH_PROOF'),
      ledgerBlockId: 'BLOCK-EVD-01'
    },
    {
      id: 'CUST-002',
      evidenceId: ev1Id,
      eventType: 'TRANSFER',
      actorId: 'USR-IO-01',
      actorName: 'Inspector Rajesh Verma',
      actorRole: 'investigating_officer',
      fromCustodian: 'Inspector Rajesh Verma (Crime Branch)',
      toCustodian: 'Dr. Ramesh Rao (CFSL Ballistics Division)',
      location: 'CFSL Ballistics Secure Evidence Vault #4',
      timestamp: '2026-08-05T11:30:00Z',
      reason: 'Formal requisition for microscopic ballistics comparison and chamber pressure verification',
      acknowledgedByDestination: true,
      acknowledgedAt: '2026-08-05T12:00:00Z',
      hashProof: CryptoService.sha256('CUSTODY_2_HASH_PROOF'),
      ledgerBlockId: 'BLOCK-EVD-02'
    }
  );

  // Helper for seeding additional evidence items
  const seedEvidenceHelper = (params: {
    id: string;
    evidenceNumber: string;
    caseItem: Case;
    type: EvidenceType;
    description: string;
    collectionLocation: string;
    collectionTimestamp: string;
    storageLocker: string;
    currentCustodian: string;
    currentCustodianRole: string;
    handlingNotes: string;
    linkedDocumentIds: string[];
    custodyEvents: Array<{
      id: string;
      eventType: 'COLLECTION' | 'TRANSFER' | 'ANALYSIS' | 'COURT_PRODUCED';
      actorId: string;
      actorName: string;
      actorRole: string;
      fromCustodian: string;
      toCustodian: string;
      location: string;
      timestamp: string;
      reason: string;
    }>;
  }) => {
    const hash = CryptoService.sha256(`${params.id}:${params.type}:${params.description}`);
    db.evidence_items.push({
      id: params.id,
      evidenceNumber: params.evidenceNumber,
      caseId: params.caseItem.id,
      caseNumber: params.caseItem.caseNumber,
      type: params.type,
      description: params.description,
      collectionLocation: params.collectionLocation,
      collectionTimestamp: params.collectionTimestamp,
      collectorId: 'USR-IO-01',
      collectorName: 'Inspector Rajesh Verma',
      storageLocker: params.storageLocker,
      currentCustodian: params.currentCustodian,
      currentCustodianRole: params.currentCustodianRole as any,
      handlingNotes: params.handlingNotes,
      sha256Hash: hash,
      linkedDocumentIds: params.linkedDocumentIds,
      isLocked: true,
      createdAt: params.collectionTimestamp,
      updatedAt: params.collectionTimestamp
    });

    for (const ce of params.custodyEvents) {
      db.custody_events.push({
        id: ce.id,
        evidenceId: params.id,
        eventType: ce.eventType as any,
        actorId: ce.actorId,
        actorName: ce.actorName,
        actorRole: ce.actorRole as any,
        fromCustodian: ce.fromCustodian,
        toCustodian: ce.toCustodian,
        location: ce.location,
        timestamp: ce.timestamp,
        reason: ce.reason,
        acknowledgedByDestination: true,
        acknowledgedAt: ce.timestamp,
        hashProof: CryptoService.sha256(`${ce.id}_HASH_PROOF`),
        ledgerBlockId: `BLOCK-${ce.id}`
      });
    }
  };

  // EVD 2 (Case 1): Cloned SIM & Phone
  seedEvidenceHelper({
    id: 'EVD-2026-002',
    evidenceNumber: 'EVD-2026-102',
    caseItem: case1,
    type: 'Digital',
    description: 'Dual-SIM Xiaomi Redmi Note 12 with cloned eSIM profile used for interception of escrow bank OTPs.',
    collectionLocation: 'Sector 10 Transit Flat, Dwarka, New Delhi',
    collectionTimestamp: '2026-08-15T14:00:00Z',
    storageLocker: 'CFSL Cyber Evidence Locker #8',
    currentCustodian: 'Dr. Ramesh Rao (Senior Forensic Scientist)',
    currentCustodianRole: 'forensic_officer',
    handlingNotes: 'Faraday isolation pouch active. Battery isolated to prevent remote wipe commands.',
    linkedDocumentIds: ['DOC-2026-001', 'DOC-2026-004'],
    custodyEvents: [
      {
        id: 'CUST-003',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Transit Room Dwarka',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Dwarka Cyber PS Malkhana',
        timestamp: '2026-08-15T14:30:00Z',
        reason: 'Seizure during raid on transit hideout'
      },
      {
        id: 'CUST-004',
        eventType: 'TRANSFER',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Inspector Rajesh Verma',
        toCustodian: 'Dr. Ramesh Rao (CFSL Cyber Lab)',
        location: 'CFSL Cyber Evidence Locker #8',
        timestamp: '2026-08-16T10:00:00Z',
        reason: 'Forensic physical chip extraction and SQLite database recovery'
      }
    ]
  });

  // EVD 3 (Case 2): Fired 9mm Shell Casing
  seedEvidenceHelper({
    id: 'EVD-2026-003',
    evidenceNumber: 'EVD-2026-103',
    caseItem: case2,
    type: 'Ballistic',
    description: 'One spent 9mm brass cartridge casing recovered near Pillar B with distinct firing pin indentation.',
    collectionLocation: 'Commercial Arcade Ground Floor, Hauz Khas',
    collectionTimestamp: '2026-08-02T23:15:00Z',
    storageLocker: 'CFSL Ballistics Secure Evidence Vault #4',
    currentCustodian: 'Dr. Ramesh Rao',
    currentCustodianRole: 'forensic_officer',
    handlingNotes: 'Maintained in rigid protective plastic container wrapped with cotton to preserve breech-face striations.',
    linkedDocumentIds: ['DOC-2026-002', 'DOC-2026-005'],
    custodyEvents: [
      {
        id: 'CUST-005',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Crime Scene Floor',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Hauz Khas Malkhana',
        timestamp: '2026-08-02T23:30:00Z',
        reason: 'Evidence recovery under panchnama'
      }
    ]
  });

  // EVD 4 (Case 3): MacBook Pro & SSD
  seedEvidenceHelper({
    id: 'EVD-2026-004',
    evidenceNumber: 'EVD-2026-104',
    caseItem: case3,
    type: 'Digital',
    description: 'Apple MacBook Pro 14" (M2 Pro) and SanDisk Extreme 2TB SSD containing neural video render caches and deepfake project files.',
    collectionLocation: 'Transit Flat, Sector 19 Dwarka',
    collectionTimestamp: '2026-08-11T08:00:00Z',
    storageLocker: 'CFSL Cyber Forensics Lab Station 2',
    currentCustodian: 'Dr. Ramesh Rao',
    currentCustodianRole: 'forensic_officer',
    handlingNotes: 'Hardware write-blocker utilized for all forensic bitstream image captures.',
    linkedDocumentIds: ['DOC-2026-006', 'DOC-2026-007', 'DOC-2026-008'],
    custodyEvents: [
      {
        id: 'CUST-006',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Raid Scene Dwarka',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Crime Branch Malkhana',
        timestamp: '2026-08-11T09:00:00Z',
        reason: 'Seizure of digital device under Sec 100 CrPC'
      },
      {
        id: 'CUST-007',
        eventType: 'TRANSFER',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Inspector Rajesh Verma',
        toCustodian: 'Dr. Ramesh Rao (CFSL Cyber Lab)',
        location: 'CFSL Cyber Forensics Lab Station 2',
        timestamp: '2026-08-12T11:00:00Z',
        reason: 'Physical bitstream acquisition and Section 65B hash certification'
      }
    ]
  });

  // EVD 5 (Case 4): Hardware Crypto Wallet
  seedEvidenceHelper({
    id: 'EVD-2026-005',
    evidenceNumber: 'EVD-2026-105',
    caseItem: case4,
    type: 'Digital',
    description: 'Ledger Nano X Hardware Crypto Wallet and 14 Tokenized Mule Debit Cards linked to hawala laundering network.',
    collectionLocation: 'Shop 42, Central Market, Lajpat Nagar-II',
    collectionTimestamp: '2026-08-16T12:00:00Z',
    storageLocker: 'STF High-Security Evidence Safe #1',
    currentCustodian: 'ACP Sunita Mehta',
    currentCustodianRole: 'supervisor',
    handlingNotes: 'Hardware PIN lock attempts strictly prohibited. Seed phrase recovered in sealed envelope.',
    linkedDocumentIds: ['DOC-2026-009', 'DOC-2026-010'],
    custodyEvents: [
      {
        id: 'CUST-008',
        eventType: 'COLLECTION',
        actorId: 'USR-SUP-01',
        actorName: 'ACP Sunita Mehta',
        actorRole: 'supervisor',
        fromCustodian: 'Shop Counter Safe',
        toCustodian: 'ACP Sunita Mehta',
        location: 'STF High-Security Evidence Safe #1',
        timestamp: '2026-08-16T13:00:00Z',
        reason: 'Seizure under PMLA and CrPC warrant'
      }
    ]
  });

  // EVD 6 (Case 5): 22K Broken Gold Necklace
  seedEvidenceHelper({
    id: 'EVD-2026-006',
    evidenceNumber: 'EVD-2026-106',
    caseItem: case5,
    type: 'Biological / Forensic',
    description: 'Recovered 22K Yellow Gold Snapped Choker Necklace (24.60g) with victim DNA trace swabbing taken from broken clasp.',
    collectionLocation: 'Begumpur Village Hideout, Hauz Khas',
    collectionTimestamp: '2026-08-14T06:30:00Z',
    storageLocker: 'Lajpat Nagar PS Central Malkhana Vault',
    currentCustodian: 'Inspector Rajesh Verma',
    currentCustodianRole: 'investigating_officer',
    handlingNotes: 'DNA swab tube DEL-DNA-882 sealed separately. Gold verified by certified government goldsmith.',
    linkedDocumentIds: ['DOC-2026-011'],
    custodyEvents: [
      {
        id: 'CUST-009',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Suspect Rahul Verma Hideout',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Lajpat Nagar PS Central Malkhana Vault',
        timestamp: '2026-08-14T07:15:00Z',
        reason: 'Recovery on disclosure statement of accused'
      }
    ]
  });

  // EVD 7 (Case 5): Bajaj Pulsar 220 Motorcycle
  seedEvidenceHelper({
    id: 'EVD-2026-007',
    evidenceNumber: 'EVD-2026-107',
    caseItem: case5,
    type: 'Physical Weapon',
    description: 'Black Bajaj Pulsar 220 Motorcycle (DL-3S-CQ-4102) with modified silencer used as getaway vehicle in snatchings.',
    collectionLocation: 'Green Park Metro Station Parking Lot',
    collectionTimestamp: '2026-08-14T08:00:00Z',
    storageLocker: 'Lajpat Nagar PS Impounded Vehicle Yard',
    currentCustodian: 'Inspector Rajesh Verma',
    currentCustodianRole: 'investigating_officer',
    handlingNotes: 'Impounded vehicle parked in covered bay. Tires and handle grips swabbed for touch DNA.',
    linkedDocumentIds: ['DOC-2026-011', 'DOC-2026-012'],
    custodyEvents: [
      {
        id: 'CUST-010',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Metro Station Parking',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Lajpat Nagar PS Impounded Vehicle Yard',
        timestamp: '2026-08-14T08:30:00Z',
        reason: 'Recovery of vehicle used in commission of crime'
      }
    ]
  });

  // EVD 8 (Case 6): .32 Bore Country Pistol
  seedEvidenceHelper({
    id: 'EVD-2026-008',
    evidenceNumber: 'EVD-2026-108',
    caseItem: case6,
    type: 'Ballistic',
    description: 'One .32 Bore Country-made Semi-Automatic Pistol with wooden grip plate and two spent bullet cartridge cases.',
    collectionLocation: 'Pocket 4 Transformer Enclosure, Sector 7 Rohini',
    collectionTimestamp: '2026-08-19T04:00:00Z',
    storageLocker: 'CFSL Ballistics Secure Evidence Vault #4',
    currentCustodian: 'Dr. Ramesh Rao',
    currentCustodianRole: 'forensic_officer',
    handlingNotes: 'Forensic ballistics test fired. Fingerprint powder dusting completed.',
    linkedDocumentIds: ['DOC-2026-013', 'DOC-2026-014'],
    custodyEvents: [
      {
        id: 'CUST-011',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Pocket 4 Transformer',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Rohini North PS Malkhana',
        timestamp: '2026-08-19T05:00:00Z',
        reason: 'Recovery on pointing out by accused Deepak Rana'
      },
      {
        id: 'CUST-012',
        eventType: 'TRANSFER',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Inspector Rajesh Verma',
        toCustodian: 'Dr. Ramesh Rao (CFSL Ballistics)',
        location: 'CFSL Ballistics Secure Evidence Vault #4',
        timestamp: '2026-08-20T10:00:00Z',
        reason: 'Ballistics comparison with crime scene fired cases'
      }
    ]
  });

  // EVD 9 (Case 7): OBD-II Key Scanner & Jammer
  seedEvidenceHelper({
    id: 'EVD-2026-009',
    evidenceNumber: 'EVD-2026-109',
    caseItem: case7,
    type: 'Electronic Device',
    description: 'Autel MaxiIM IM608 Pro II OBD-II Key Programming Diagnostic Tool and 8-antenna handheld GPS/GSM Jammer.',
    collectionLocation: 'Gali No. 3 Godown, Naiwala, Karol Bagh',
    collectionTimestamp: '2026-08-14T19:00:00Z',
    storageLocker: 'Central District AATS Evidence Locker #2',
    currentCustodian: 'Inspector Rajesh Verma',
    currentCustodianRole: 'investigating_officer',
    handlingNotes: 'Radio frequency emission testing logged. EEPROM extraction completed.',
    linkedDocumentIds: ['DOC-2026-016'],
    custodyEvents: [
      {
        id: 'CUST-013',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Godown Workshop Naiwala',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Central District AATS Evidence Locker #2',
        timestamp: '2026-08-14T20:00:00Z',
        reason: 'Seizure of tools used in sophisticated auto lifting'
      }
    ]
  });

  // EVD 10 (Case 7): Recovered Hyundai Creta
  seedEvidenceHelper({
    id: 'EVD-2026-010',
    evidenceNumber: 'EVD-2026-110',
    caseItem: case7,
    type: 'Physical Weapon',
    description: 'White Hyundai Creta (Restored VIN: MALC381CLPM901828) recovered with counterfeit number plate DL-8C-AA-9912.',
    collectionLocation: 'Godown Basement, Karol Bagh',
    collectionTimestamp: '2026-08-14T20:30:00Z',
    storageLocker: 'Central District Malkhana Vehicle Yard',
    currentCustodian: 'Inspector Rajesh Verma',
    currentCustodianRole: 'investigating_officer',
    handlingNotes: 'Chemical acid etching on chassis restored original manufacturer serial numbers.',
    linkedDocumentIds: ['DOC-2026-015', 'DOC-2026-016'],
    custodyEvents: [
      {
        id: 'CUST-014',
        eventType: 'COLLECTION',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        fromCustodian: 'Godown Basement',
        toCustodian: 'Inspector Rajesh Verma',
        location: 'Central District Malkhana Vehicle Yard',
        timestamp: '2026-08-14T21:00:00Z',
        reason: 'Physical vehicle recovery under panchnama'
      }
    ]
  });

  // 5. Seed Police Assets (Decoupled Module)
  db.police_assets.push(
    {
      id: 'AST-2026-001',
      assetNumber: 'AST-DEL-2026-101',
      name: 'Mahindra Scorpio-N Patrol & Interceptor Vehicle',
      type: 'Vehicle',
      serialNumber: 'DL-1CA-9021-ENG-49102',
      department: 'Crime Branch Special Cell',
      currentCustodianId: 'USR-IO-01',
      currentCustodianName: 'Inspector Rajesh Verma',
      location: 'Hauz Khas Crime Branch Motor Pool',
      condition: 'Good',
      purchaseDate: '2024-03-15',
      warrantyExpiry: '2027-03-15',
      status: 'Assigned',
      linkedCaseId: case1.id,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'AST-2026-002',
      assetNumber: 'AST-DEL-2026-102',
      name: 'Cellebrite UFED Touch 3 Mobile Forensics Extraction Unit',
      type: 'Forensic Equipment',
      serialNumber: 'CLB-UFED-99210-PRO',
      department: 'Ballistics & Digital Forensics',
      currentCustodianId: 'USR-FOR-01',
      currentCustodianName: 'Dr. Ramesh Rao',
      location: 'CFSL Cyber Lab Station 3',
      condition: 'Excellent',
      purchaseDate: '2025-01-10',
      warrantyExpiry: '2028-01-10',
      status: 'Assigned',
      linkedCaseId: case1.id,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    },
    {
      id: 'AST-2026-003',
      assetNumber: 'AST-DEL-2026-103',
      name: 'Motorola APX 8000 P25 Encrypted Tactical Radio',
      type: 'Wireless Radio / Comms',
      serialNumber: 'MOT-APX-8000-8812',
      department: 'Crime Branch Special Cell',
      currentCustodianName: 'Armory / Equipment Locker',
      location: 'Special Cell Comms Vault',
      condition: 'Excellent',
      purchaseDate: '2024-11-20',
      warrantyExpiry: '2027-11-20',
      status: 'Registered',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z'
    }
  );

  // 6. Seed Share Link
  db.share_links.push({
    id: 'SHR-2026-001',
    shareToken: 'e4a91fbc73082910fae82918293746a18291039485726192',
    documentId: 'DOC-2026-001',
    resourceType: 'DOCUMENT',
    resourceTitle: 'FIR No. 101/2026: Formal First Information Report',
    sharedByUserId: 'USR-IO-01',
    sharedByName: 'Inspector Rajesh Verma',
    recipientEmail: 'external.advocate@lawfirm.in',
    recipientName: 'Adv. Rohit Bansal',
    recipientOrg: 'Bansal & Associates (Counsel for Apex Escrow)',
    permission: 'VIEW_ONLY',
    watermarkText: 'CONFIDENTIAL - For Adv. Rohit Bansal - Legal Review Only - MHA Delhi',
    purpose: 'Preliminary inspection copy for bail opposition brief',
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    isRevoked: false,
    accessCount: 2,
    createdAt: '2026-08-16T12:00:00Z'
  });

  // 7. Seed Criminal / Person Records (Internal CPID & Biometric Profiles - 28 Detailed Records)
  db.persons.push(
    {
      id: 'PER-2026-001',
      cpid: 'CPID-DL-2024-88412',
      fullName: 'Vikram Malhotra',
      aliases: ['Vicky', 'Vicky Hauz Khas', 'Vikram Don'],
      fatherOrSpouseName: 'Late Shri O.P. Malhotra',
      gender: 'Male',
      dobOrAge: '34 Yrs (DOB: 12-Nov-1991)',
      nationality: 'Indian',
      primaryPhone: '+91-98110-44219',
      identificationMarks: [
        'Deep linear scar 3cm above left eyebrow',
        'Tattoo of a scorpion on right forearm'
      ],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-912',
        mugshotUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      },
      address: 'House No. 42B, Sector 3, Hauz Khas, New Delhi',
      policeStation: 'Hauz Khas PS',
      district: 'South District',
      state: 'Delhi',
      pincode: '110016',
      riskRating: 'Critical',
      primaryCrimeType: 'Armed Robbery & Extortion',
      modusOperandi: 'Armed holdups at commercial jewelry establishments using country-made 9mm firearm with motorcycle getaway.',
      gangOrSyndicateAffiliation: 'Malhotra-Gogi Inter-State Armed Syndicate',
      previousConvictionsCount: 3,
      linkedCases: [
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Accused',
          sectionCharges: 'IPC 302, 120B / BNS 103(1), 61(2), Arms Act 25/27',
          status: 'Under Trial'
        },
        {
          caseId: case1.id,
          caseNumber: case1.caseNumber,
          role: 'Suspect',
          sectionCharges: 'IPC 420, 120B / BNS 318(4)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Inspector Rajesh Verma (Crime Branch / NCRB AFIS Hub)',
      createdAt: '2026-08-03T10:00:00Z',
      updatedAt: '2026-08-20T14:30:00Z'
    },
    {
      id: 'PER-2026-002',
      cpid: 'CPID-DL-2025-10294',
      fullName: 'Pooja Sharma',
      aliases: ['Complainant Pooja'],
      fatherOrSpouseName: 'Mahesh Sharma',
      gender: 'Female',
      dobOrAge: '29 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98711-20981',
      identificationMarks: ['Small mole on right cheek'],
      biometrics: {
        afisStatus: 'NOT_ENROLLED',
        irisEnrolled: false
      },
      address: 'Flat 12, Green Park Extension, New Delhi',
      policeStation: 'Hauz Khas PS',
      district: 'South District',
      state: 'Delhi',
      pincode: '110016',
      riskRating: 'Low',
      previousConvictionsCount: 0,
      linkedCases: [
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Victim',
          sectionCharges: 'First Informant / Victim',
          status: 'Filed'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'SI Priya Nair (Hauz Khas PS)',
      createdAt: '2026-08-01T12:00:00Z',
      updatedAt: '2026-08-01T12:00:00Z'
    },
    {
      id: 'PER-2026-003',
      cpid: 'CPID-DL-2025-44910',
      fullName: 'Ramesh Kumar',
      aliases: ['Guard Ramesh'],
      fatherOrSpouseName: 'Gopal Das',
      gender: 'Male',
      dobOrAge: '46 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-97110-88219',
      identificationMarks: ['Burn scar on right wrist'],
      biometrics: {
        afisStatus: 'NOT_ENROLLED',
        irisEnrolled: false
      },
      address: 'Village Shahpur Jat, Hauz Khas, New Delhi',
      policeStation: 'Hauz Khas PS',
      district: 'South District',
      state: 'Delhi',
      pincode: '110049',
      riskRating: 'Low',
      previousConvictionsCount: 0,
      linkedCases: [
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Witness',
          sectionCharges: 'Deposition under Section 180 BNSS / 161 CrPC',
          status: 'Under Trial'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Inspector Rajesh Verma',
      createdAt: '2026-08-03T11:00:00Z',
      updatedAt: '2026-08-03T11:00:00Z'
    },
    {
      id: 'PER-2026-004',
      cpid: 'CPID-WB-2023-77192',
      fullName: 'Amitav Roy',
      aliases: ['Crypto Roy', 'Telegram: @roymule_99', 'Amit Roy'],
      fatherOrSpouseName: 'Subhash Roy',
      gender: 'Male',
      dobOrAge: '27 Yrs (DOB: 04-Apr-1999)',
      nationality: 'Indian',
      primaryPhone: '+91-98301-77810',
      identificationMarks: [
        'Dark circular birthmark on left shoulder',
        'Scar from burn on left palm'
      ],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-WB-2023-118',
        mugshotUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
      },
      address: 'Block C, Sector V, Salt Lake, Kolkata / Transit Flat: Dwarka Sector 10, Delhi',
      policeStation: 'Dwarka Sector 23 Cyber PS',
      district: 'South West District',
      state: 'Delhi',
      pincode: '110075',
      riskRating: 'Critical',
      primaryCrimeType: 'Cyber Fraud & Phishing',
      modusOperandi: 'Telegram escrow crypto siphoning, corporate session token hijacking, mule banking laundering.',
      gangOrSyndicateAffiliation: 'DarkNet Telegram Mule & Crypto Laundering Network',
      previousConvictionsCount: 2,
      linkedCases: [
        {
          caseId: case1.id,
          caseNumber: case1.caseNumber,
          role: 'Accused',
          sectionCharges: 'IT Act Sec 66D, IPC 420, 120B / BNS 318(4)',
          status: 'Active Investigation'
        },
        {
          caseId: case4.id,
          caseNumber: case4.caseNumber,
          role: 'Accused',
          sectionCharges: 'IT Act Sec 66C, 66D / BNS 318(4), 336(3)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'ACP Cyber Crime Branch / Kolkata STF',
      createdAt: '2026-08-10T14:00:00Z',
      updatedAt: '2026-08-20T16:00:00Z'
    },
    {
      id: 'PER-2026-005',
      cpid: 'CPID-DL-2026-90114',
      fullName: 'Tarun Singhania',
      aliases: ['Tarun Seth'],
      fatherOrSpouseName: 'R.K. Singhania',
      gender: 'Male',
      dobOrAge: '52 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98100-33441',
      identificationMarks: ['Surgical scar on right knee'],
      biometrics: {
        afisStatus: 'NOT_ENROLLED',
        irisEnrolled: false
      },
      address: 'B-4/29, Vasant Vihar Enclave, New Delhi',
      policeStation: 'Vasant Vihar PS',
      district: 'South West District',
      state: 'Delhi',
      pincode: '110057',
      riskRating: 'Low',
      previousConvictionsCount: 0,
      linkedCases: [
        {
          caseId: case1.id,
          caseNumber: case1.caseNumber,
          role: 'Victim',
          sectionCharges: 'Escrow Wire Fraud Complainant (INR 14.50 Lakhs)',
          status: 'Active Investigation'
        },
        {
          caseId: case4.id,
          caseNumber: case4.caseNumber,
          role: 'Victim',
          sectionCharges: 'Phishing APK Complainant (INR 78 Lakhs)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Inspector Rajesh Verma',
      createdAt: '2026-08-12T10:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z'
    },
    {
      id: 'PER-2026-006',
      cpid: 'CPID-DL-2024-10291',
      fullName: 'Rahul Verma',
      aliases: ['Kala', 'Rahul Kala', 'Pulsar Kala'],
      fatherOrSpouseName: 'Ramu Verma',
      gender: 'Male',
      dobOrAge: '26 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98112-90182',
      identificationMarks: ['Deep cut mark on right chin', 'Tattoo of Trishul on left wrist'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-401',
        mugshotUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
      },
      address: 'Gali No. 4, Begumpur Village, Hauz Khas, New Delhi',
      policeStation: 'Hauz Khas PS',
      district: 'South District',
      state: 'Delhi',
      pincode: '110016',
      riskRating: 'High',
      primaryCrimeType: 'Snatching & Robbery',
      modusOperandi: 'Pillion rider gold chain and iPhone snatching on black Pulsar 220 motorcycle near Hauz Khas market and Green Park metro.',
      gangOrSyndicateAffiliation: 'Begumpur Snatchers Gang',
      previousConvictionsCount: 4,
      linkedCases: [
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 304(1), 309(4) / IPC 379, 356, 392',
          status: 'Active Investigation'
        },
        {
          caseId: case5.id,
          caseNumber: case5.caseNumber,
          role: 'Suspect',
          sectionCharges: 'BNS 304(2) [Snatching with hurt]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Inspector Rajesh Verma (Hauz Khas PS)',
      createdAt: '2026-08-05T10:00:00Z',
      updatedAt: '2026-08-19T14:00:00Z'
    },
    {
      id: 'PER-2026-007',
      cpid: 'CPID-DL-2024-55912',
      fullName: 'Irfan Khan',
      aliases: ['Cheeta', 'Irfan Duke', 'Cheeta Snatcher'],
      fatherOrSpouseName: 'Noor Mohammad Khan',
      gender: 'Male',
      dobOrAge: '24 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98710-33412',
      identificationMarks: ['Stitch marks on left cheek', 'Scar on left elbow'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-559',
        mugshotUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
      },
      address: 'House No. 19, Jal Vihar, Lajpat Nagar-I, New Delhi',
      policeStation: 'Lajpat Nagar PS',
      district: 'South-East District',
      state: 'Delhi',
      pincode: '110024',
      riskRating: 'Critical',
      primaryCrimeType: 'Snatching & Robbery',
      modusOperandi: 'High-speed mobile & handbag snatching on modified KTM Duke motorcycle near Central Market Lajpat Nagar.',
      gangOrSyndicateAffiliation: 'Cheeta-Duke Cross-District Snatching Syndicate',
      previousConvictionsCount: 5,
      linkedCases: [
        {
          caseId: case5.id,
          caseNumber: case5.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 304(1), 304(2) [Snatching with injury]',
          status: 'Active Investigation'
        },
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Suspect',
          sectionCharges: 'BNS 309(4) [Robbery]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'ACP South-East / Lajpat Nagar PS',
      createdAt: '2026-08-02T11:00:00Z',
      updatedAt: '2026-08-20T17:00:00Z'
    },
    {
      id: 'PER-2026-008',
      cpid: 'CPID-DL-2023-88210',
      fullName: 'Bunty Sharma',
      aliases: ['Langda', 'Bunty Langda', 'Bunty Pocket'],
      fatherOrSpouseName: 'Sita Ram Sharma',
      gender: 'Male',
      dobOrAge: '31 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98118-22340',
      identificationMarks: ['Limp in right leg', 'Cross tattoo on chest'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2023-882'
      },
      address: 'Gali 7, Garhi Village, Lajpat Nagar, New Delhi',
      policeStation: 'Lajpat Nagar PS',
      district: 'South-East District',
      state: 'Delhi',
      pincode: '110065',
      riskRating: 'High',
      primaryCrimeType: 'Snatching & Robbery',
      modusOperandi: 'Purse snatching and distraction theft targeting women shoppers at pedestrian crossings & bus stops.',
      gangOrSyndicateAffiliation: 'Garhi Village Snatching Ring',
      previousConvictionsCount: 3,
      linkedCases: [
        {
          caseId: case5.id,
          caseNumber: case5.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 304(1) [Snatching], 309(4)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Inspector Verma',
      createdAt: '2026-07-20T10:00:00Z',
      updatedAt: '2026-08-16T14:00:00Z'
    },
    {
      id: 'PER-2026-009',
      cpid: 'CPID-DL-2024-77189',
      fullName: 'Satish Gurjar',
      aliases: ['Gurjar', 'Satish Key', 'Satish Scanner'],
      fatherOrSpouseName: 'Dharampal Gurjar',
      gender: 'Male',
      dobOrAge: '33 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98711-99881',
      identificationMarks: ['Mole on upper lip', 'Burn mark on left shin'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-771'
      },
      address: 'Kalyan Samiti Road, Lajpat Nagar-IV, New Delhi',
      policeStation: 'Lajpat Nagar PS',
      district: 'South-East District',
      state: 'Delhi',
      pincode: '110024',
      riskRating: 'High',
      primaryCrimeType: 'Vehicle Theft / Auto-Lifting',
      modusOperandi: 'OBD scanner device and master key frequency cloner for stealing Creta, Brezza and Fortuner SUVs.',
      gangOrSyndicateAffiliation: 'Mewat-Delhi Inter-State Auto Lifting Cartel',
      previousConvictionsCount: 4,
      linkedCases: [
        {
          caseId: case7.id,
          caseNumber: case7.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 303(2), 317(2) [Theft of Motor Vehicle]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Crime Branch AATS',
      createdAt: '2026-08-01T09:00:00Z',
      updatedAt: '2026-08-17T11:00:00Z'
    },
    {
      id: 'PER-2026-010',
      cpid: 'CPID-DL-2025-99201',
      fullName: 'Karanvir Sethi',
      aliases: ['POS Karan', 'Skimmer Sethi'],
      fatherOrSpouseName: 'Harbhajan Sethi',
      gender: 'Male',
      dobOrAge: '28 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98114-11209',
      identificationMarks: ['Small circular scar on right forehead'],
      biometrics: {
        afisStatus: 'PENDING',
        irisEnrolled: false
      },
      address: 'E-Block, Amar Colony, Lajpat Nagar-IV, New Delhi',
      policeStation: 'Lajpat Nagar PS',
      district: 'South-East District',
      state: 'Delhi',
      pincode: '110024',
      riskRating: 'Moderate',
      primaryCrimeType: 'Cyber Fraud & Phishing',
      modusOperandi: 'Cloning credit/debit cards using modified bluetooth POS terminals in boutique retail outlets.',
      gangOrSyndicateAffiliation: 'South Delhi Carding Ring',
      previousConvictionsCount: 1,
      linkedCases: [
        {
          caseId: case4.id,
          caseNumber: case4.caseNumber,
          role: 'Suspect',
          sectionCharges: 'IT Act 66C, 66D / BNS 318(4)',
          status: 'Under Scrutiny'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Cyber Cell South-East',
      createdAt: '2026-08-08T12:00:00Z',
      updatedAt: '2026-08-15T15:00:00Z'
    },
    {
      id: 'PER-2026-011',
      cpid: 'CPID-DL-2023-66231',
      fullName: 'Deepak Rana',
      aliases: ['Gogi Shooter', 'Deepak Pistol', 'Shooter Deepak'],
      fatherOrSpouseName: 'Naresh Rana',
      gender: 'Male',
      dobOrAge: '25 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98109-77610',
      identificationMarks: ['Gunshot graze scar on right shoulder', 'Tattoo: Only God Can Judge Me on neck'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2023-662',
        mugshotUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80'
      },
      address: 'Pocket 3, Sector 7, Rohini, New Delhi',
      policeStation: 'Rohini North PS',
      district: 'Rohini District',
      state: 'Delhi',
      pincode: '110085',
      riskRating: 'Critical',
      primaryCrimeType: 'Snatching & Robbery',
      modusOperandi: 'Daylight chain snatching at gunpoint and armed extortion from sweet shop owners near Japanese Park.',
      gangOrSyndicateAffiliation: 'Gogi-Rohini Armed Syndicate',
      previousConvictionsCount: 6,
      linkedCases: [
        {
          caseId: case6.id,
          caseNumber: case6.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 308(2), 109, Arms Act 25/27',
          status: 'Active Investigation'
        },
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Suspect',
          sectionCharges: 'Arms Act 25 / BNS 61(2)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'DCP Special Cell Rohini',
      createdAt: '2026-07-15T10:00:00Z',
      updatedAt: '2026-08-20T18:00:00Z'
    },
    {
      id: 'PER-2026-012',
      cpid: 'CPID-DL-2024-33182',
      fullName: 'Pradeep Sharma',
      aliases: ['Pawan', 'Pradeep Bike', 'Chor Pradeep'],
      fatherOrSpouseName: 'Kailash Sharma',
      gender: 'Male',
      dobOrAge: '29 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98719-44019',
      identificationMarks: ['Deep cut on right forearm', 'Mole near left ear'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-331'
      },
      address: 'Block B, Sector 8, Rohini, New Delhi',
      policeStation: 'Rohini North PS',
      district: 'Rohini District',
      state: 'Delhi',
      pincode: '110085',
      riskRating: 'High',
      primaryCrimeType: 'Vehicle Theft / Auto-Lifting',
      modusOperandi: 'Two-wheeler lifting from Rohini Sector 7 & 8 parking lots, dismantling chassis in godowns and selling spare parts.',
      gangOrSyndicateAffiliation: 'North-West Auto Lifters Union',
      previousConvictionsCount: 4,
      linkedCases: [
        {
          caseId: case6.id,
          caseNumber: case6.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 303(2), 317(2) [Theft & Receiving Stolen Auto]',
          status: 'Active Investigation'
        },
        {
          caseId: case7.id,
          caseNumber: case7.caseNumber,
          role: 'Suspect',
          sectionCharges: 'BNS 303(2) [Motor Theft]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Inspector Special Staff Rohini',
      createdAt: '2026-08-01T11:00:00Z',
      updatedAt: '2026-08-18T14:00:00Z'
    },
    {
      id: 'PER-2026-013',
      cpid: 'CPID-DL-2022-11093',
      fullName: 'Monu Tyagi',
      aliases: ['Monu Bawana', 'Bawana Gangster', 'Tyagi Don'],
      fatherOrSpouseName: 'Brijpal Tyagi',
      gender: 'Male',
      dobOrAge: '36 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98101-88902',
      identificationMarks: ['Bullet entry scar on abdomen', 'Sword scar on left wrist'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2022-110'
      },
      address: 'Village Bawana, Outer District / Transit: Sector 11 Rohini, New Delhi',
      policeStation: 'Rohini North PS',
      district: 'Rohini District',
      state: 'Delhi',
      pincode: '110039',
      riskRating: 'Critical',
      primaryCrimeType: 'Armed Robbery & Extortion',
      modusOperandi: 'Threatening traders on WhatsApp VoIP, sending armed henchmen, firing rounds, collecting protection extortion money.',
      gangOrSyndicateAffiliation: 'Neeraj Bawana-Tyagi Inter-State Syndicate',
      previousConvictionsCount: 7,
      linkedCases: [
        {
          caseId: case6.id,
          caseNumber: case6.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 308(2) [Extortion], 109 [Attempt to Murder], 61(2), Arms Act 25/27',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Special Cell Southern & Northern Range',
      createdAt: '2026-06-10T10:00:00Z',
      updatedAt: '2026-08-20T19:00:00Z'
    },
    {
      id: 'PER-2026-014',
      cpid: 'CPID-DL-2024-88902',
      fullName: 'Jitender Rana',
      aliases: ['Kallu', 'Jitu Kallu', 'Kallu Rohini'],
      fatherOrSpouseName: 'Sunder Lal Rana',
      gender: 'Male',
      dobOrAge: '27 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98711-66554',
      identificationMarks: ['Deep knife scar on back', 'Broken tooth front upper jaw'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-889'
      },
      address: 'Block E, Sector 16, Rohini, New Delhi',
      policeStation: 'Rohini North PS',
      district: 'Rohini District',
      state: 'Delhi',
      pincode: '110089',
      riskRating: 'High',
      primaryCrimeType: 'Assault & Grievous Hurt',
      modusOperandi: 'Gang clashes using butcher knives, iron pipes and country pistols over local parking & betting territory.',
      gangOrSyndicateAffiliation: 'Rohini Sector 16 Clashing Crew',
      previousConvictionsCount: 3,
      linkedCases: [
        {
          caseId: case6.id,
          caseNumber: case6.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 115(2), 118(1) [Grievous hurt by dangerous weapon]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Rohini North PS IO',
      createdAt: '2026-08-01T12:00:00Z',
      updatedAt: '2026-08-18T10:00:00Z'
    },
    {
      id: 'PER-2026-015',
      cpid: 'CPID-DL-2025-44810',
      fullName: 'Nitin Chopra',
      aliases: ['APK Nitin', 'Bill Scam Chopra'],
      fatherOrSpouseName: 'M.K. Chopra',
      gender: 'Male',
      dobOrAge: '30 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98110-33499',
      identificationMarks: ['Birthmark on nape of neck'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2025-448'
      },
      address: 'Flat 402, Sector 23 Dwarka, New Delhi',
      policeStation: 'Dwarka Sector 23 Cyber PS',
      district: 'South West District',
      state: 'Delhi',
      pincode: '110077',
      riskRating: 'Critical',
      primaryCrimeType: 'Cyber Fraud & Phishing',
      modusOperandi: 'Fake electricity disconnection SMS APK phishing scam harvesting bank credentials and OTP interception.',
      gangOrSyndicateAffiliation: 'Jamtara-Dwarka Phishing Nexus',
      previousConvictionsCount: 2,
      linkedCases: [
        {
          caseId: case4.id,
          caseNumber: case4.caseNumber,
          role: 'Accused',
          sectionCharges: 'IT Act 66C, 66D / BNS 318(4), 336(3)',
          status: 'Active Investigation'
        },
        {
          caseId: case1.id,
          caseNumber: case1.caseNumber,
          role: 'Accused',
          sectionCharges: 'IT Act 66 / BNS 318(4)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Cyber Crime Unit Dwarka',
      createdAt: '2026-08-04T10:00:00Z',
      updatedAt: '2026-08-20T14:00:00Z'
    },
    {
      id: 'PER-2026-016',
      cpid: 'CPID-DL-2024-19283',
      fullName: 'Sandeep Mehra',
      aliases: ['AI Sandy', 'Voice Sandy'],
      fatherOrSpouseName: 'Anand Mehra',
      gender: 'Male',
      dobOrAge: '29 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98712-00918',
      identificationMarks: ['Mole below right eye'],
      biometrics: {
        afisStatus: 'PENDING',
        irisEnrolled: false
      },
      address: 'Pocket B, Sector 19 Dwarka, New Delhi',
      policeStation: 'Dwarka Sector 23 Cyber PS',
      district: 'South West District',
      state: 'Delhi',
      pincode: '110075',
      riskRating: 'High',
      primaryCrimeType: 'Cyber Fraud & Phishing',
      modusOperandi: 'AI voice clone extortion scam impersonating police officers and lawyers claiming children are in custody.',
      gangOrSyndicateAffiliation: 'Virtual Voice Scam Syndicate',
      previousConvictionsCount: 1,
      linkedCases: [
        {
          caseId: case4.id,
          caseNumber: case4.caseNumber,
          role: 'Suspect',
          sectionCharges: 'BNS 308(2), 318(4) / IT Act 66D',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Dwarka Cyber PS',
      createdAt: '2026-08-07T14:00:00Z',
      updatedAt: '2026-08-16T12:00:00Z'
    },
    {
      id: 'PER-2026-017',
      cpid: 'CPID-DL-2024-60192',
      fullName: 'Ashu Qureshi',
      aliases: ['Blade', 'Ashu Blade', 'Surgical Ashu'],
      fatherOrSpouseName: 'Akbar Qureshi',
      gender: 'Male',
      dobOrAge: '25 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98111-40912',
      identificationMarks: ['Surgical blade cuts on fingers', 'Scar on upper lip'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-601'
      },
      address: 'Gali No. 3, Naiwala, Karol Bagh, New Delhi',
      policeStation: 'Karol Bagh PS',
      district: 'Central District',
      state: 'Delhi',
      pincode: '110005',
      riskRating: 'Critical',
      primaryCrimeType: 'Snatching & Robbery',
      modusOperandi: 'Surgical blade slashing bags and gold necklaces in crowded Karol Bagh jewelry bazaar and Bank Street.',
      gangOrSyndicateAffiliation: 'Central District Blade Snatchers',
      previousConvictionsCount: 5,
      linkedCases: [
        {
          caseId: case7.id,
          caseNumber: case7.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 304(2) [Snatching with hurt], 309(4)',
          status: 'Active Investigation'
        },
        {
          caseId: case5.id,
          caseNumber: case5.caseNumber,
          role: 'Suspect',
          sectionCharges: 'BNS 304(1) [Snatching]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'ACP Karol Bagh',
      createdAt: '2026-07-28T10:00:00Z',
      updatedAt: '2026-08-19T16:00:00Z'
    },
    {
      id: 'PER-2026-018',
      cpid: 'CPID-DL-2023-90812',
      fullName: 'Vicky Rathore',
      aliases: ['Vicky Chor', 'Masterkey Vicky', 'Rathore Lifter'],
      fatherOrSpouseName: 'Mohan Rathore',
      gender: 'Male',
      dobOrAge: '32 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98710-99011',
      identificationMarks: ['Tattoo of tiger on right biceps', 'Burn mark on right collarbone'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2023-908'
      },
      address: 'Padam Singh Road, Karol Bagh, New Delhi',
      policeStation: 'Karol Bagh PS',
      district: 'Central District',
      state: 'Delhi',
      pincode: '110005',
      riskRating: 'High',
      primaryCrimeType: 'Vehicle Theft / Auto-Lifting',
      modusOperandi: 'Stealing commercial delivery vans and Maruti Swift cars from Karol Bagh market parking using master electronic keys.',
      gangOrSyndicateAffiliation: 'Central Delhi Auto Theft Nexus',
      previousConvictionsCount: 4,
      linkedCases: [
        {
          caseId: case7.id,
          caseNumber: case7.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 303(2), 317(2), 336(3) [Auto Theft & Forgery]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'AATS Central District',
      createdAt: '2026-08-02T09:00:00Z',
      updatedAt: '2026-08-18T15:00:00Z'
    },
    {
      id: 'PER-2026-019',
      cpid: 'CPID-DL-2022-77401',
      fullName: 'Kuldeep Yadav',
      aliases: ['Billa', 'Kuldeep Billa', 'Bullion Billa'],
      fatherOrSpouseName: 'Rajender Yadav',
      gender: 'Male',
      dobOrAge: '35 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98100-22109',
      identificationMarks: ['Scar on bridge of nose', 'Mole on throat'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2022-774'
      },
      address: 'Arya Samaj Road, Karol Bagh, New Delhi',
      policeStation: 'Karol Bagh PS',
      district: 'Central District',
      state: 'Delhi',
      pincode: '110005',
      riskRating: 'Critical',
      primaryCrimeType: 'Armed Robbery & Extortion',
      modusOperandi: 'Extortion demands against gold bullion merchants and hawala couriers with armed intimidation.',
      gangOrSyndicateAffiliation: 'Billa Extortion Syndicate',
      previousConvictionsCount: 5,
      linkedCases: [
        {
          caseId: case7.id,
          caseNumber: case7.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 308(2) [Extortion], Arms Act 25',
          status: 'Active Investigation'
        },
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Suspect',
          sectionCharges: 'BNS 310(2) [Dacoity with weapon]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Special Staff Central District',
      createdAt: '2026-07-10T10:00:00Z',
      updatedAt: '2026-08-20T17:00:00Z'
    },
    {
      id: 'PER-2026-020',
      cpid: 'CPID-DL-2025-11928',
      fullName: 'Vishal Gautam',
      aliases: ['Chhotu', 'Vishal CP', 'Coin Chhotu'],
      fatherOrSpouseName: 'Santosh Gautam',
      gender: 'Male',
      dobOrAge: '22 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98711-33219',
      identificationMarks: ['Small birthmark under left ear'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: false,
        dnaReferenceId: 'DNA-DEL-2025-119'
      },
      address: 'Panchkuian Road Basti, Connaught Place, New Delhi',
      policeStation: 'Connaught Place PS',
      district: 'New Delhi District',
      state: 'Delhi',
      pincode: '110001',
      riskRating: 'High',
      primaryCrimeType: 'Snatching & Robbery',
      modusOperandi: 'Distraction coin-drop method to lift laptop bags, briefcases and luggage from parked vehicles in Inner & Outer Circle.',
      gangOrSyndicateAffiliation: 'Thak-Thak Distraction Gang',
      previousConvictionsCount: 3,
      linkedCases: [
        {
          caseId: case1.id,
          caseNumber: case1.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 303(2), 304(1) [Theft & Snatching]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Connaught Place PS',
      createdAt: '2026-08-02T10:00:00Z',
      updatedAt: '2026-08-19T11:00:00Z'
    },
    {
      id: 'PER-2026-021',
      cpid: 'CPID-DL-2023-55829',
      fullName: 'MD. Rashid',
      aliases: ['Heroin', 'Rashid Smack', 'CP Peddler'],
      fatherOrSpouseName: 'MD. Yamin',
      gender: 'Male',
      dobOrAge: '30 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98110-88192',
      identificationMarks: ['Scar on left shoulder', 'Mole on right palm'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2023-558'
      },
      address: 'Hanuman Road Lane, Connaught Place, New Delhi',
      policeStation: 'Connaught Place PS',
      district: 'New Delhi District',
      state: 'Delhi',
      pincode: '110001',
      riskRating: 'Critical',
      primaryCrimeType: 'Narcotics & NDPS',
      modusOperandi: 'Peddling commercial grade smack, MDMA and synthetic contraband around CP nightlife corridors.',
      gangOrSyndicateAffiliation: 'Inter-State NDPS Supply Ring',
      previousConvictionsCount: 4,
      linkedCases: [
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Suspect',
          sectionCharges: 'NDPS Act Sec 21, 29 / BNS 61(2)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Anti-Narcotics Squad New Delhi',
      createdAt: '2026-07-19T10:00:00Z',
      updatedAt: '2026-08-17T12:00:00Z'
    },
    {
      id: 'PER-2026-022',
      cpid: 'CPID-DL-2024-44019',
      fullName: 'Dharmendra Paswan',
      aliases: ['Dharmi', 'Dharmi Ustad', 'Cleaver Dharmi'],
      fatherOrSpouseName: 'Jageshwar Paswan',
      gender: 'Male',
      dobOrAge: '33 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98719-77112',
      identificationMarks: ['Long linear scar across chest', 'Missing tip of left little finger'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-440'
      },
      address: 'Block 11, Kalyanpuri, East Delhi',
      policeStation: 'Kalyanpuri PS',
      district: 'East District',
      state: 'Delhi',
      pincode: '110091',
      riskRating: 'Critical',
      primaryCrimeType: 'Assault & Grievous Hurt',
      modusOperandi: 'Violent stabbing with meat cleavers and iron blades during street gambling arguments and territory fights.',
      gangOrSyndicateAffiliation: 'Kalyanpuri Block 11 Syndicate',
      previousConvictionsCount: 5,
      linkedCases: [
        {
          caseId: case6.id,
          caseNumber: case6.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 109, 118(1) [Attempt to Murder & Grievous Weapon Hurt]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'East District Special Staff',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-19T15:00:00Z'
    },
    {
      id: 'PER-2026-023',
      cpid: 'CPID-DL-2025-22819',
      fullName: 'Suraj Kashyap',
      aliases: ['Pappu', 'Suraj Snatcher', 'Rickshaw Pappu'],
      fatherOrSpouseName: 'Dinesh Kashyap',
      gender: 'Male',
      dobOrAge: '23 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98110-55441',
      identificationMarks: ['Burn scar on left wrist', 'Cross tattoo on right hand'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: false
      },
      address: 'Trilokpuri Block 27 / Kalyanpuri Border, East Delhi',
      policeStation: 'Kalyanpuri PS',
      district: 'East District',
      state: 'Delhi',
      pincode: '110091',
      riskRating: 'High',
      primaryCrimeType: 'Snatching & Robbery',
      modusOperandi: 'Snatching gold earrings, mangalsutras and smartphones from e-rickshaw female passengers at turnings.',
      gangOrSyndicateAffiliation: 'Trilokpuri Snatchers Crew',
      previousConvictionsCount: 3,
      linkedCases: [
        {
          caseId: case5.id,
          caseNumber: case5.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 304(1), 304(2) [Snatching with Hurt]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Kalyanpuri PS IO',
      createdAt: '2026-08-06T11:00:00Z',
      updatedAt: '2026-08-18T16:00:00Z'
    },
    {
      id: 'PER-2026-024',
      cpid: 'CPID-DL-2022-99014',
      fullName: 'Salma Begum',
      aliases: ['Ammi', 'Salma Smack', 'Queen of Seemapuri'],
      fatherOrSpouseName: 'Late Shakir Beg',
      gender: 'Female',
      dobOrAge: '48 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98712-44110',
      identificationMarks: ['Surgical scar on throat', 'Gold tooth upper left molar'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2022-990'
      },
      address: 'E-Block, New Seemapuri, Shahdara, Delhi',
      policeStation: 'Seemapuri PS',
      district: 'Shahdara District',
      state: 'Delhi',
      pincode: '110095',
      riskRating: 'Critical',
      primaryCrimeType: 'Narcotics & NDPS',
      modusOperandi: 'Cross-border illicit smack and psychotropic tablet distribution network using juvenile couriers.',
      gangOrSyndicateAffiliation: 'Seemapuri Drug Supply Syndicate',
      previousConvictionsCount: 6,
      linkedCases: [
        {
          caseId: case1.id,
          caseNumber: case1.caseNumber,
          role: 'Suspect',
          sectionCharges: 'NDPS Act 21(c), 29 / BNS 61(2)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Narcotics Control Cell Shahdara',
      createdAt: '2026-06-15T10:00:00Z',
      updatedAt: '2026-08-20T17:00:00Z'
    },
    {
      id: 'PER-2026-025',
      cpid: 'CPID-DL-2024-11827',
      fullName: 'Akhtar Ali',
      aliases: ['Truck Akhtar', 'Engine Changer', 'Akhtar Auto'],
      fatherOrSpouseName: 'Liyakat Ali',
      gender: 'Male',
      dobOrAge: '38 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98114-77091',
      identificationMarks: ['Grease burn mark on right forearm', 'Mole on chin'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2024-118'
      },
      address: 'Old Seemapuri Scrap Market, Shahdara, Delhi',
      policeStation: 'Seemapuri PS',
      district: 'Shahdara District',
      state: 'Delhi',
      pincode: '110095',
      riskRating: 'High',
      primaryCrimeType: 'Vehicle Theft / Auto-Lifting',
      modusOperandi: 'Heavy commercial truck hijacking, engine chassis grinding, welding forged plates and fabricating counterfeit RC papers.',
      gangOrSyndicateAffiliation: 'Inter-State Commercial Vehicle Theft Ring',
      previousConvictionsCount: 4,
      linkedCases: [
        {
          caseId: case7.id,
          caseNumber: case7.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 303(2), 317(2), 336(3) [Chassis Forgery & Theft]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'AATS Shahdara',
      createdAt: '2026-08-01T09:00:00Z',
      updatedAt: '2026-08-17T11:00:00Z'
    },
    {
      id: 'PER-2026-026',
      cpid: 'CPID-DL-2023-77011',
      fullName: 'Shahrukh Malik',
      aliases: ['Katta', 'Shahrukh Katta', 'Fire Shahrukh'],
      fatherOrSpouseName: 'Farooq Malik',
      gender: 'Male',
      dobOrAge: '24 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98710-11928',
      identificationMarks: ['Gunpowder burn mark on left hand', 'Scar on forehead'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2023-770'
      },
      address: 'B-Block, Nand Nagri / Seemapuri, Delhi',
      policeStation: 'Seemapuri PS',
      district: 'Shahdara District',
      state: 'Delhi',
      pincode: '110093',
      riskRating: 'Critical',
      primaryCrimeType: 'Assault & Grievous Hurt',
      modusOperandi: 'Desi-katta country firearm public firing, brandishing prohibited weapons during extortion rounds.',
      gangOrSyndicateAffiliation: 'Nand Nagri Armed Gang',
      previousConvictionsCount: 3,
      linkedCases: [
        {
          caseId: case6.id,
          caseNumber: case6.caseNumber,
          role: 'Accused',
          sectionCharges: 'Arms Act 25, 27 / BNS 109 [Attempt to Murder]',
          status: 'Active Investigation'
        },
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Suspect',
          sectionCharges: 'Arms Act 25 / BNS 61(2)',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Seemapuri PS IO',
      createdAt: '2026-07-22T10:00:00Z',
      updatedAt: '2026-08-19T14:00:00Z'
    },
    {
      id: 'PER-2026-027',
      cpid: 'CPID-DL-2023-44102',
      fullName: 'Manjeet Singh',
      aliases: ['Chabiwala', 'Master Chabi', 'Manjeet Lock'],
      fatherOrSpouseName: 'Joginder Singh',
      gender: 'Male',
      dobOrAge: '37 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98108-11239',
      identificationMarks: ['Surgical scar on right shoulder', 'Tattoo of Khanda on left arm'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2023-441'
      },
      address: 'Shahpur Jat Village, Hauz Khas, New Delhi',
      policeStation: 'Hauz Khas PS',
      district: 'South District',
      state: 'Delhi',
      pincode: '110049',
      riskRating: 'High',
      primaryCrimeType: 'Burglary & House-Breaking',
      modusOperandi: 'Master key lock picking residential apartments and builder floors during holiday weekends; stealing jewelry and cash.',
      gangOrSyndicateAffiliation: 'South Delhi Master Lock Burglary Ring',
      previousConvictionsCount: 4,
      linkedCases: [
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 305, 331(4) [Lurking house-trespass & theft]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Hauz Khas Crime Team',
      createdAt: '2026-07-30T10:00:00Z',
      updatedAt: '2026-08-18T12:00:00Z'
    },
    {
      id: 'PER-2026-028',
      cpid: 'CPID-DL-2025-33109',
      fullName: 'Sonu Paswan',
      aliases: ['Bihari', 'Sonu Knuckles', 'Iron Sonu'],
      fatherOrSpouseName: 'Ram Lakhan Paswan',
      gender: 'Male',
      dobOrAge: '28 Yrs',
      nationality: 'Indian',
      primaryPhone: '+91-98711-88901',
      identificationMarks: ['Knuckleduster scar on right knuckles', 'Mole on right jaw'],
      biometrics: {
        afisStatus: 'VERIFIED',
        irisEnrolled: true,
        dnaReferenceId: 'DNA-DEL-2025-331'
      },
      address: 'Near Kali Temple, Shahpur Jat, Hauz Khas, New Delhi',
      policeStation: 'Hauz Khas PS',
      district: 'South District',
      state: 'Delhi',
      pincode: '110049',
      riskRating: 'High',
      primaryCrimeType: 'Assault & Grievous Hurt',
      modusOperandi: 'Road rage physical assault and armed intimidation using brass knuckles, iron rods and baseball bats.',
      gangOrSyndicateAffiliation: 'Shahpur Jat Enforcers',
      previousConvictionsCount: 2,
      linkedCases: [
        {
          caseId: case2.id,
          caseNumber: case2.caseNumber,
          role: 'Accused',
          sectionCharges: 'BNS 115(2), 118(1) [Voluntarily causing grievous hurt]',
          status: 'Active Investigation'
        }
      ],
      isVerifiedProfile: true,
      verificationAuthority: 'Hauz Khas PS',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-19T13:00:00Z'
    }
  );

  // 8. Seed Real-time System Notifications
  db.notifications.push(
    {
      id: 'NOTIF-2026-001',
      recipientUserId: 'USR-IO-01',
      type: 'AI_CROSS_MATCH',
      title: 'AI Cross-Case Suspect Match Detected',
      message: 'Accused Vikram Malhotra (CPID-DL-2024-88412) in FIR-2026-CR-089 has been linked as the beneficiary recipient in cyber docket FIR-2026-CR-104 (Dwarka PS).',
      severity: 'CRITICAL',
      isRead: false,
      caseId: case1.id,
      actionUrl: '#/intelligence',
      createdAt: '2026-08-20T15:00:00Z'
    },
    {
      id: 'NOTIF-2026-002',
      recipientRole: 'supervisor',
      type: 'SIGNATURE_REQUEST',
      title: 'Digital Signature Scrutiny Required',
      message: 'Inspector Rajesh Verma submitted Final Charge Sheet (DOC-2026-001) for statutory supervisory signature approval under Section 193 BNSS.',
      severity: 'WARNING',
      isRead: false,
      caseId: case2.id,
      documentId: 'DOC-2026-001',
      actionUrl: '#/documents/DOC-2026-001',
      createdAt: '2026-08-20T14:15:00Z'
    },
    {
      id: 'NOTIF-2026-003',
      recipientRole: 'forensic_officer',
      type: 'CUSTODY_TRANSFER',
      title: 'Chain-of-Custody Handover Awaiting Check-In',
      message: 'Exhibit EVD-2026-101 (Country-made 9mm Firearm) was logged for CFSL Ballistics examination. Receipt acknowledgement pending.',
      severity: 'INFO',
      isRead: true,
      caseId: case2.id,
      actionUrl: '#/evidence',
      createdAt: '2026-08-19T09:30:00Z'
    },
    {
      id: 'NOTIF-2026-004',
      type: 'TAMPER_ALERT',
      title: 'Merkle Ledger Chain Cryptographic Proof Verified',
      message: 'Automated 24-hour Merkle tree integrity verification complete. All 18 ledger blocks verified with 0 discrepancy.',
      severity: 'SUCCESS',
      isRead: true,
      actionUrl: '#/audit',
      createdAt: '2026-08-20T06:00:00Z'
    }
  );

  db.save();
  console.log('[SEED] NyayaSetu database populated successfully with realistic MHA/NCRB dataset (Cases, Documents, Evidence, Assets, Persons, Notifications, Ledger).');
}


// Auto-run if executed directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase().catch(console.error);
}
