export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type AccountState = 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'DEPARTED';
export type AssignmentStatus = 'ACTIVE' | 'REMOVED';
export type RewardStatus = 'ACTIVE' | 'REMOVED';
export type RewardRequestStatus = 'PENDING_TO_APPROVE' | 'PENDING_TO_RECEIVE' | 'COMPLETED' | 'DECLINED';
export type ActivityType = 'CHALLENGE' | 'MISSION';
export type ActivityStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED';
export type VerificationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ProposalStatus = 'PENDING_TO_APPROVE' | 'READY_TO_DO' | 'COMPLETED' | 'DECLINED' | 'CANCELED';
export type GuidanceCardStatus = 'ACTIVE' | 'REMOVED';
export type NotificationReadStatus = 'UNREAD' | 'READ';
export type ActionType =
  | 'POOL_FUND_TEACHER'
  | 'TEACHER_AWARD_STUDENT'
  | 'ADMIN_ADJUST_STUDENT'
  | 'REWARD_RESERVE_POINTS'
  | 'REWARD_DECLINE_RETURN'
  | 'REWARD_REMOVE_RETURN'
  | 'REWARD_RECEIVE_COMPLETE'
  | 'CHALLENGE_AWARD_STUDENT'
  | 'PROPOSAL_AWARD_STUDENT'
  | 'STUDENT_DEPARTURE_DEDUCT';

export interface User {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
  accountState: AccountState;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  classId: string | null;
  class?: Class | null;
  currentBalance: number;
  reservedBalance: number;
  highestBalance: number;
  currentTierId: string | null;
  currentTier?: TierConfiguration | null;
}

export interface TeacherProfile {
  id: string;
  pointBalance: number;
}

export interface UserMe extends User {
  studentProfile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
}

export interface LoginResponse {
  sessionId: string;
  role: Role;
  user: User;
}

export interface Class {
  id: string;
  name: string;
  gradeLevel?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  students?: {
    id: string;
    user: User;
    currentBalance: number;
    currentTier?: TierConfiguration | null;
  }[];
  teacherAssignments?: TeacherAssignment[];
}

export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  teacher?: User;
  classId: string;
  class?: Class;
  subjectId: string;
  subject?: Subject;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TierConfiguration {
  id: string;
  tierNumber: number;
  name: string;
  minPointsThreshold: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemPointPool {
  id: string;
  balance: number;
  updatedAt: string;
}

export interface PointTaskOption {
  id: string;
  taskId: string;
  points: number;
  label?: string | null;
}

export interface PointTransferTask {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  options: PointTaskOption[];
}

export interface PointAuditLog {
  id: string;
  correlationId: string;
  actorId?: string | null;
  actor?: User | null;
  actorRole: Role;
  sourceType: string;
  sourceId?: string | null;
  recipientType: string;
  recipientId?: string | null;
  amount: number;
  actionType: ActionType;
  taskOrReason: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  resultingSourceBalance?: number | null;
  resultingRecipientBalance?: number | null;
  createdAt: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  pointPrice: number;
  requiresApproval: boolean;
  inventoryQuantity: number | null;
  status: RewardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RewardRequest {
  id: string;
  studentId: string;
  student?: User;
  rewardId: string;
  reward?: Reward;
  priceAtRequest: number;
  requiresApproval: boolean;
  status: RewardRequestStatus;
  reservedAmount: number;
  declineReason?: string | null;
  reviewedByAdminId?: string | null;
  reviewedByAdmin?: User | null;
  reviewedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  pointValue: number;
  completionLimit: number;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
  completionCount?: number;
  isBanned?: boolean;
  isDone?: boolean;
  verificationStatus?: VerificationStatus | null;
}

export interface VerificationRequest {
  id: string;
  studentId: string;
  student?: User;
  activityId: string;
  activity?: Activity;
  textDescription: string;
  fileAttachmentUrl?: string | null;
  status: VerificationStatus;
  rejectionReason?: string | null;
  reviewedByAdminId?: string | null;
  reviewedByAdmin?: User | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface StudentTaskProposal {
  id: string;
  studentId: string;
  student?: User;
  title?: string | null;
  description: string;
  status: ProposalStatus;
  assignedPointValue?: number | null;
  declineReason?: string | null;
  reviewedByAdminId?: string | null;
  reviewedByAdmin?: User | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: TaskProposalMessage[];
}

export interface TaskProposalMessage {
  id: string;
  proposalId: string;
  senderId?: string | null;
  sender?: User | null;
  senderRole: Role;
  message: string;
  createdAt: string;
}

export interface GuidanceCard {
  id: string;
  title: string;
  description: string;
  logoKey: string;
  pointRangeLabel: string;
  status: GuidanceCardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  subject: string;
  body: string;
  readStatus: NotificationReadStatus;
  readAt?: string | null;
  originatingEntityType: string;
  originatingEntityId: string;
  createdAt: string;
}

export interface DailySnapshot {
  id: string;
  studentId: string;
  balance: number;
  schoolRank: number;
  classRank?: number | null;
  snapshotDate: string;
  createdAt: string;
}

export interface RankedStudent {
  rank: number;
  studentId: string;
  studentName: string;
  username: string;
  points: number;
}

export interface StudentRankingView {
  totalActiveStudents: number;
  selfRank?: {
    rank: number;
    studentName: string;
    points: number;
  };
  topStudents: {
    rank: number;
    studentName: string;
    points: number;
  }[];
}

export interface StaffRankingView {
  totalActiveStudents: number;
  rankings: RankedStudent[];
}

export interface PaginatedResult<T> {
  total: number;
  limit?: number;
  offset?: number;
  data: T[];
}
