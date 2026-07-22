import type { Project, User } from "./types";

export const CURRENT_USER: User = {
  id: "usr_001",
  name: "Jordan Avery",
  email: "jordan@northbeam.io",
  role: "Owner",
  avatarColor: "#2E6BE6",
  orgId: "org_001",
  orgName: "Northbeam Consulting",
};

export const SEED_PROJECTS: Project[] = [
  {
    id: "proj_001",
    name: "Core Banking Platform Migration",
    customer: "Meridian Financial",
    status: "In Progress",
    proposalStatus: "Draft",
    monthlyEstimate: 18400,
    createdAt: "2026-05-12",
    updatedAt: "2026-07-18",
    owner: "Jordan Avery",
    archived: false,
    description:
      "Lift-and-shift of a legacy core banking stack to a multi-region cloud-native architecture with active-active failover.",
  },
  {
    id: "proj_002",
    name: "ERP Rollout — 500 Seats",
    customer: "Halcyon Manufacturing",
    status: "Proposal Sent",
    proposalStatus: "Sent",
    monthlyEstimate: 9200,
    createdAt: "2026-04-02",
    updatedAt: "2026-07-15",
    owner: "Priya Nathan",
    archived: false,
    description:
      "Cloud-native ERP deployment sized for 500 concurrent employees with high availability and automated backup.",
  },
  {
    id: "proj_003",
    name: "Retail Analytics Data Lake",
    customer: "Fernwood Retail Group",
    status: "Discovery",
    proposalStatus: "Not Started",
    monthlyEstimate: 4100,
    createdAt: "2026-07-01",
    updatedAt: "2026-07-19",
    owner: "Jordan Avery",
    archived: false,
    description:
      "Consolidated data lake and BI layer for point-of-sale and inventory analytics across 140 stores.",
  },
  {
    id: "proj_004",
    name: "Patient Records Modernization",
    customer: "Cascade Health Network",
    status: "Won",
    proposalStatus: "Approved",
    monthlyEstimate: 26700,
    createdAt: "2026-02-20",
    updatedAt: "2026-06-30",
    owner: "Priya Nathan",
    archived: false,
    description:
      "HIPAA-compliant modernization of patient records infrastructure with encrypted storage and regional isolation.",
  },
  {
    id: "proj_005",
    name: "Internal DevOps Tooling",
    customer: "Northbeam Consulting (Internal)",
    status: "Lost",
    proposalStatus: "Sent",
    monthlyEstimate: 1800,
    createdAt: "2026-03-11",
    updatedAt: "2026-05-02",
    owner: "Jordan Avery",
    archived: true,
    description: "Internal CI/CD and observability stack evaluation.",
  },
  {
    id: "proj_006",
    name: "Logistics Fleet Telemetry",
    customer: "Ridgeline Freight",
    status: "In Progress",
    proposalStatus: "In Review",
    monthlyEstimate: 12950,
    createdAt: "2026-06-08",
    updatedAt: "2026-07-20",
    owner: "Priya Nathan",
    archived: false,
    description:
      "Real-time telemetry ingestion for a 900-vehicle fleet with edge aggregation and cost-optimized hot/cold storage tiers.",
  },
];

export const NOTIFICATIONS = [
  { id: "n1", title: "Proposal Generated", detail: "Ridgeline Freight — v2 ready for review", time: "12m ago" },
  { id: "n2", title: "Project Updated", detail: "Meridian Financial architecture revised", time: "1h ago" },
  { id: "n3", title: "Member Invited", detail: "Priya Nathan joined as Sales Engineer", time: "3h ago" },
  { id: "n4", title: "Subscription Renewed", detail: "Professional plan renewed for August", time: "1d ago" },
];

export const RECENT_CONVERSATIONS = [
  { id: "c1", project: "Ridgeline Freight", preview: "Recommend a storage tier for cold telemetry data...", time: "18m ago" },
  { id: "c2", project: "Fernwood Retail Group", preview: "What's the estimated compute cost for 140 stores...", time: "2h ago" },
  { id: "c3", project: "Meridian Financial", preview: "Compare active-active vs active-passive failover...", time: "1d ago" },
];
