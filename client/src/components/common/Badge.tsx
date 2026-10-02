import React from 'react';
import { ConfidentialityLevel, ReviewStatus, CaseStatus, UserRole } from '../../types.js';

export const ConfidentialityBadge: React.FC<{ level: ConfidentialityLevel }> = ({ level }) => {
  const styles: Record<ConfidentialityLevel, { text: string; cls: string; dot: string }> = {
    'Top Secret': { 
      text: 'TOP SECRET', 
      cls: 'bg-[#FDF2F2] text-[#C53D3D] border-[#F8D7DA]',
      dot: 'bg-[#C53D3D]'
    },
    'Secret': { 
      text: 'SECRET', 
      cls: 'bg-[#FDF2F2] text-[#C53D3D] border-[#F8D7DA]',
      dot: 'bg-[#C53D3D]'
    },
    'Confidential': { 
      text: 'CONFIDENTIAL', 
      cls: 'bg-[#FEF7EC] text-[#B7791F] border-[#F7E2BF]',
      dot: 'bg-[#B7791F]'
    },
    'Restricted': { 
      text: 'RESTRICTED', 
      cls: 'bg-[#E8F5F6] text-[#167D8D] border-[#C5E6EA]',
      dot: 'bg-[#167D8D]'
    },
    'Unclassified': { 
      text: 'UNCLASSIFIED', 
      cls: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]',
      dot: 'bg-[#94A3B8]'
    },
  };

  const item = styles[level] || styles.Confidential;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border font-mono ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.text}</span>
    </span>
  );
};

export const ReviewStatusBadge: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  const styles: Record<ReviewStatus, { label: string; cls: string; dot: string }> = {
    'Signed': { 
      label: 'SIGNED', 
      cls: 'bg-[#EBF6F1] text-[#16805C] border-[#BEE4D3]',
      dot: 'bg-[#16805C]'
    },
    'Approved': { 
      label: 'APPROVED', 
      cls: 'bg-[#EBF6F1] text-[#16805C] border-[#BEE4D3]',
      dot: 'bg-[#16805C]'
    },
    'Submitted for Review': { 
      label: 'REVIEW', 
      cls: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
      dot: 'bg-[#2563EB]'
    },
    'Changes Requested': { 
      label: 'REVISION', 
      cls: 'bg-[#FEF7EC] text-[#B7791F] border-[#F7E2BF]',
      dot: 'bg-[#B7791F]'
    },
    'Draft': { 
      label: 'DRAFT', 
      cls: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]',
      dot: 'bg-[#94A3B8]'
    },
    'Superseded': { 
      label: 'SUPERSEDED', 
      cls: 'bg-[#F1F4F7] text-[#94A3B8] border-[#E2E8F0] line-through',
      dot: 'bg-[#94A3B8]'
    },
  };

  const item = styles[status] || { label: status.toUpperCase(), cls: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]', dot: 'bg-[#94A3B8]' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.label}</span>
    </span>
  );
};

export const CaseStatusBadge: React.FC<{ status: CaseStatus }> = ({ status }) => {
  const styles: Record<CaseStatus, { label: string; cls: string; dot: string }> = {
    'Active Investigation': { 
      label: 'ACTIVE', 
      cls: 'bg-[#E8F5F6] text-[#167D8D] border-[#C5E6EA]',
      dot: 'bg-[#167D8D]'
    },
    'Under Review': { 
      label: 'REVIEW', 
      cls: 'bg-[#FEF7EC] text-[#B7791F] border-[#F7E2BF]',
      dot: 'bg-[#B7791F]'
    },
    'Filed': { 
      label: 'FILED', 
      cls: 'bg-[#EBF6F1] text-[#16805C] border-[#BEE4D3]',
      dot: 'bg-[#16805C]'
    },
    'Under Trial': { 
      label: 'TRIAL', 
      cls: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
      dot: 'bg-[#2563EB]'
    },
    'Closed': { 
      label: 'CLOSED', 
      cls: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]',
      dot: 'bg-[#64748B]'
    },
    'Archived': { 
      label: 'ARCHIVED', 
      cls: 'bg-[#F1F4F7] text-[#94A3B8] border-[#E2E8F0]',
      dot: 'bg-[#94A3B8]'
    },
    'Draft': { 
      label: 'DRAFT', 
      cls: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]',
      dot: 'bg-[#94A3B8]'
    },
  };

  const item = styles[status] || { label: status.toUpperCase(), cls: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]', dot: 'bg-[#94A3B8]' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.label}</span>
    </span>
  );
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const titles: Record<UserRole, { label: string; style: string }> = {
    admin: { label: 'Admin', style: 'bg-[#F1F4F7] text-[#12355B] border-[#CBD5E1]' },
    investigating_officer: { label: 'IO', style: 'bg-[#E8F5F6] text-[#167D8D] border-[#C5E6EA]' },
    supervisor: { label: 'Supervisor', style: 'bg-[#F1F4F7] text-[#12355B] border-[#CBD5E1]' },
    prosecutor: { label: 'Prosecutor', style: 'bg-[#FEF7EC] text-[#B7791F] border-[#F7E2BF]' },
    judge: { label: 'Judge', style: 'bg-[#FDF2F2] text-[#C53D3D] border-[#F8D7DA]' },
    forensic_officer: { label: 'Forensics', style: 'bg-[#EBF6F1] text-[#16805C] border-[#BEE4D3]' },
    auditor: { label: 'Auditor', style: 'bg-[#EBF6F1] text-[#16805C] border-[#BEE4D3]' },
    external_stakeholder: { label: 'External', style: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]' },
  };

  const item = titles[role] || { label: role, style: 'bg-[#F1F4F7] text-[#64748B] border-[#E2E8F0]' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border ${item.style}`}>
      {item.label}
    </span>
  );
};
