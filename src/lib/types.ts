export type Role = "Owner" | "Admin" | "Sales Engineer" | "Viewer";

export interface User {
  id: string;
  name: string;
  /** Preferred display name from the auth profile (Firebase `displayName`). */
  displayName?: string;
  /** Full legal name, when captured separately from the display name. */
  fullName?: string;
  email: string;
  role: Role;
  avatarColor: string;
  orgId: string;
  orgName: string;
  photoURL?: string | null;
}

export type ProjectStatus =
  | "Discovery"
  | "In Progress"
  | "Proposal Sent"
  | "Won"
  | "Lost"
  | "Archived";

export type ProposalStatus = "Not Started" | "Draft" | "In Review" | "Sent" | "Approved";

export interface Project {
  id: string;
  name: string;
  customer: string;
  status: ProjectStatus;
  proposalStatus: ProposalStatus;
  monthlyEstimate: number;
  /** Monthly estimate in USD (canonical pricing value). */
  monthlyEstimateUsd?: number;
  /** @deprecated Display uses workspace currency; kept for migration. */
  estimateCurrencySymbol?: string;
  /** @deprecated Display uses workspace currency; kept for migration. */
  estimateCurrency?: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  archived: boolean;
  description: string;
  /** Default cloud provider for new work in this project. */
  defaultProvider?: string;
  /** Default target region. */
  defaultRegion?: string;
  /** Default currency (ISO code) for this project. */
  defaultCurrency?: string;
}
