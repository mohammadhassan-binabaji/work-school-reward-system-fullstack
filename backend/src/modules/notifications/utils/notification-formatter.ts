export interface FormattedNotification {
  subject: string;
  body: string;
}

export class NotificationFormatter {
  // EVT-01
  static formatRewardReadyForPickup(rewardName: string): FormattedNotification {
    return {
      subject: 'Reward Ready for Pickup',
      body: `Your request for "${rewardName}" is approved and ready for pickup.`,
    };
  }

  // EVT-02
  static formatRewardCompleted(rewardName: string): FormattedNotification {
    return {
      subject: 'Reward Completed',
      body: `Your request for "${rewardName}" has been handed over and completed.`,
    };
  }

  // EVT-03
  static formatRewardDeclined(rewardName: string, declineReason: string): FormattedNotification {
    return {
      subject: 'Reward Request Declined',
      body: `Your request for "${rewardName}" was declined. Reason: ${declineReason}.`,
    };
  }

  // EVT-04
  static formatRewardRequiresApproval(
    studentName: string,
    rewardName: string,
    priceAtRequest: number,
  ): FormattedNotification {
    return {
      subject: 'New Reward Request Requires Approval',
      body: `Student ${studentName} requested reward "${rewardName}" (${priceAtRequest} points) requiring approval.`,
    };
  }

  // EVT-05
  static formatProposalSubmitted(
    studentName: string,
    proposalDescriptionSummary: string,
  ): FormattedNotification {
    return {
      subject: 'New Task Proposal Submitted',
      body: `Student ${studentName} submitted a new task proposal: "${proposalDescriptionSummary}".`,
    };
  }

  // EVT-06
  static formatProposalApproved(assignedPointValue: number): FormattedNotification {
    return {
      subject: 'Task Proposal Approved',
      body: `Your task proposal has been approved with ${assignedPointValue} points.`,
    };
  }

  // EVT-07
  static formatProposalDeclined(declineReason: string): FormattedNotification {
    return {
      subject: 'Task Proposal Declined',
      body: `Your task proposal was declined. Reason: ${declineReason}.`,
    };
  }

  // EVT-08
  static formatProposalCompleted(assignedPointValue: number): FormattedNotification {
    return {
      subject: 'Task Proposal Completed',
      body: `Your task proposal has been marked completed and ${assignedPointValue} points have been awarded.`,
    };
  }

  // EVT-09
  static formatAdminProposalMessage(
    adminName: string,
    messagePreview: string,
  ): FormattedNotification {
    return {
      subject: 'New Message on Task Proposal',
      body: `Admin ${adminName} sent a message: "${messagePreview}".`,
    };
  }

  // EVT-10
  static formatStudentProposalMessage(
    studentName: string,
    messagePreview: string,
  ): FormattedNotification {
    return {
      subject: 'New Student Message on Proposal',
      body: `Student ${studentName} sent a message on proposal: "${messagePreview}".`,
    };
  }

  // EVT-11
  static formatVerificationSubmitted(
    studentName: string,
    activityType: string,
    activityTitle: string,
  ): FormattedNotification {
    return {
      subject: 'New Activity Verification Submitted',
      body: `Student ${studentName} submitted verification for ${activityType} "${activityTitle}".`,
    };
  }

  // EVT-12
  static formatVerificationApproved(
    activityType: string,
    activityTitle: string,
    pointValue: number,
  ): FormattedNotification {
    return {
      subject: 'Verification Approved',
      body: `Your verification for ${activityType} "${activityTitle}" was approved. You earned ${pointValue} points!`,
    };
  }

  // EVT-13
  static formatVerificationRejected(
    activityType: string,
    activityTitle: string,
    rejectionReason: string,
  ): FormattedNotification {
    return {
      subject: 'Verification Rejected',
      body: `Your verification for ${activityType} "${activityTitle}" was rejected. Reason: ${rejectionReason}.`,
    };
  }

  // EVT-14
  static formatActivityBan(
    activityTitle: string,
    bannedUntil: Date | string,
  ): FormattedNotification {
    const bannedUntilDate =
      bannedUntil instanceof Date ? bannedUntil.toISOString() : bannedUntil;
    return {
      subject: 'Activity Submission Ban',
      body: `You have received 3 rejections for "${activityTitle}". You are temporarily banned from submitting for this activity until ${bannedUntilDate}.`,
    };
  }

  // EVT-15
  static formatActivityUnblock(activityTitle: string): FormattedNotification {
    return {
      subject: 'Activity Eligibility Restored',
      body: `Your submission eligibility for activity "${activityTitle}" has been restored by an administrator.`,
    };
  }

  // EVT-16
  static formatPointAwarded(
    teacherName: string,
    amount: number,
    taskName: string,
  ): FormattedNotification {
    return {
      subject: 'Points Awarded',
      body: `Teacher ${teacherName} awarded you ${amount} points for task "${taskName}".`,
    };
  }

  // EVT-17
  static formatPointAdjusted(amount: number, reason: string): FormattedNotification {
    return {
      subject: 'Point Balance Adjusted',
      body: `An administrator adjusted your balance by ${amount} points. Reason: ${reason}.`,
    };
  }

  // EVT-18
  static formatPointAllocated(amount: number, newBalance: number): FormattedNotification {
    return {
      subject: 'Point Budget Allocated',
      body: `An administrator allocated ${amount} points to your award budget. Your new available balance is ${newBalance} points.`,
    };
  }
}
