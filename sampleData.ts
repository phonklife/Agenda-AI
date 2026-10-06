export interface SampleDoc {
  id: string;
  title: string;
  category: string;
  fileName: string;
  content: string;
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'prd-launch',
    title: 'Product Launch PRD: Mobile App v2.0',
    category: 'Product & Tech',
    fileName: 'mobile_v2_launch_prd.md',
    content: `# Mobile App v2.0 Launch Specification & Readiness
Prepared by: Sarah Chen (Lead Product Manager)
Contributors: Alex Rivera (Head of Engineering), Elena Rostova (Product Designer), Marcus Vance (Marketing Director), David Kim (QA Lead)

## Executive Summary
We are preparing for the public rollout of Mobile App v2.0 next Thursday. This release includes the redesigned checkout funnel, biometrics login, and offline cache mode.

## Key Objectives for the Meeting
1. Align engineering, design, and marketing on the launch timeline.
2. Review QA regression testing status (current blocker: Stripe 3D Secure timeout on iOS 17).
3. Finalize rollback protocol and on-call rotation schedule for launch night.
4. Agree on marketing push timing (push notifications vs email newsletter embargo).

## Open Discussion Topics & Decisions Needed
- Payment Gateway Fallback: Should we soft-launch to 10% of users on Monday or go 100% on Thursday?
- Marketing Assets: Video teaser pending final cut from creative agency.
- Support Readiness: Customer support team needs a 1-page escalation cheat sheet before Tuesday.

## Expected Outcomes
- Greenlight for release candidate v2.0-rc3.
- Designated launch commander and hourly war-room schedule.
- Final sign-off from Alex (Engineering) and Marcus (Marketing).`
  },
  {
    id: 'q3-strategy',
    title: 'Q3 Executive Strategy & Budget Review',
    category: 'Executive & Finance',
    fileName: 'q3_executive_strategy.txt',
    content: `MEMORANDUM: Q3 STRATEGY & RESOURCE ALLOCATION SYNC
Participants:
- Rachel Green, CEO (Meeting Chair)
- Thomas Sterling, Chief Financial Officer
- Dr. Aris Thorne, VP of Research & AI
- Priya Patel, VP of Global Sales

PURPOSE:
Evaluate Q2 performance benchmarks, approve the Q3 cloud infrastructure budget expansion, and review enterprise sales pipeline targets.

KEY TOPICS:
1. Financial Review (15 mins):
Thomas will present the Q2 variance analysis. Revenue exceeded target by 8%, but GPU compute costs grew 22% due to training LLM agent pilots.

2. AI Infrastructure Expansion Decision (20 mins):
Dr. Thorne proposes leasing a 64-node cluster for the upcoming multi-agent feature. Requires a $180k quarterly commitment. CFO requires ROI justification and customer commitment milestones.

3. Enterprise Sales Strategy (15 mins):
Priya will present 4 Fortune 500 contracts currently in final legal review. Discuss enterprise SLA commitments and customized deployment requirements.

4. Action Items & Closing (10 mins):
Summary of approvals, capital budget authorization, and next board meeting readout prep.`
  },
  {
    id: 'sprint-retro',
    title: 'Sprint 42 Retro & Sprint 43 Planning',
    category: 'Agile Engineering',
    fileName: 'sprint_42_retro_and_planning.md',
    content: `# Sprint 42 Retrospective & Sprint 43 Commitment
Team: Core Platform Engineering (Squad Delta)
Facilitator: Liam O'Connor (Scrum Master)
Key Attendees: Maya Lin (Tech Lead), Jordan Bell (Frontend Lead), Samira Khan (DevOps), Noah Miller (Backend)

## Retrospective Findings
- What went well: Zero production incidents during database migration; latency dropped by 35ms.
- What went poorly: CI/CD test suite took 28 minutes per PR; blocked 3 critical PRs on sprint close day.
- Unplanned work: 18 hours spent debugging third-party webhook rate limits.

## Sprint 43 Planning Goals
1. CI Pipeline Optimization (Target: Reduce build time under 10 minutes).
2. Complete OAuth2 Refresh Token automatic rotation.
3. Establish alerting thresholds for WebSocket connection spikes.
4. Capacity estimation: 68 story points available across 5 engineers.`
  }
];
