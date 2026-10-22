export interface FormattedNotification {
  subject: string;
  body: string;
}

function toPersianDigits(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) + 0x06c0),
  );
}

function formatPersianDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid activity ban expiry date');
  }

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-arabext', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Tehran',
  }).format(date);
}

export class NotificationFormatter {
  // EVT-01
  static formatRewardReadyForPickup(rewardName: string): FormattedNotification {
    return {
      subject: 'جایزه آمادهٔ دریافت است',
      body: `درخواست شما برای «${rewardName}» تأیید شده و آمادهٔ دریافت است.`,
    };
  }

  // EVT-02
  static formatRewardCompleted(rewardName: string): FormattedNotification {
    return {
      subject: 'جایزه تحویل داده شد',
      body: `جایزه «${rewardName}» به شما تحویل داده شد و درخواست آن تکمیل شده است.`,
    };
  }

  // EVT-03
  static formatRewardDeclined(rewardName: string, declineReason: string): FormattedNotification {
    return {
      subject: 'درخواست جایزه رد شد',
      body: `درخواست شما برای «${rewardName}» رد شد. دلیل: ${declineReason}`,
    };
  }

  // EVT-04
  static formatRewardRequiresApproval(
    studentName: string,
    rewardName: string,
    priceAtRequest: number,
  ): FormattedNotification {
    return {
      subject: 'درخواست جایزه جدید برای بررسی',
      body: `دانش‌آموز ${studentName} جایزه «${rewardName}» را به قیمت ${toPersianDigits(priceAtRequest)} نوین درخواست کرده است و این درخواست نیاز به تأیید دارد.`,
    };
  }

  // EVT-05
  static formatProposalSubmitted(
    studentName: string,
    proposalDescriptionSummary: string,
  ): FormattedNotification {
    return {
      subject: 'پیشنهاد فعالیت جدید',
      body: `دانش‌آموز ${studentName} پیشنهاد فعالیت جدیدی ثبت کرده است: «${proposalDescriptionSummary}».`,
    };
  }

  // EVT-06
  static formatProposalApproved(assignedPointValue: number): FormattedNotification {
    return {
      subject: 'پیشنهاد فعالیت تأیید شد',
      body: `پیشنهاد فعالیت شما با ${toPersianDigits(assignedPointValue)} نوین تأیید شد.`,
    };
  }

  // EVT-07
  static formatProposalDeclined(declineReason: string): FormattedNotification {
    return {
      subject: 'پیشنهاد فعالیت رد شد',
      body: `پیشنهاد فعالیت شما رد شد. دلیل: ${declineReason}`,
    };
  }

  // EVT-08
  static formatProposalCompleted(assignedPointValue: number): FormattedNotification {
    return {
      subject: 'پیشنهاد فعالیت انجام شد',
      body: `پیشنهاد فعالیت شما تکمیل شد و ${toPersianDigits(assignedPointValue)} نوین به شما تعلق گرفت.`,
    };
  }

  // EVT-09
  static formatAdminProposalMessage(
    adminName: string,
    messagePreview: string,
  ): FormattedNotification {
    return {
      subject: 'پیام جدید دربارهٔ پیشنهاد فعالیت',
      body: `مدیر ${adminName} پیامی فرستاده است: «${messagePreview}».`,
    };
  }

  // EVT-10
  static formatStudentProposalMessage(
    studentName: string,
    messagePreview: string,
  ): FormattedNotification {
    return {
      subject: 'پیام جدید دانش‌آموز دربارهٔ پیشنهاد',
      body: `دانش‌آموز ${studentName} دربارهٔ پیشنهاد پیامی فرستاده است: «${messagePreview}».`,
    };
  }

  // EVT-11
  static formatVerificationSubmitted(
    studentName: string,
    activityType: string,
    activityTitle: string,
  ): FormattedNotification {
    return {
      subject: 'درخواست تأیید فعالیت جدید',
      body: `دانش‌آموز ${studentName} درخواست تأیید ${activityType} «${activityTitle}» را ثبت کرده است.`,
    };
  }

  // EVT-12
  static formatVerificationApproved(
    activityType: string,
    activityTitle: string,
    pointValue: number,
  ): FormattedNotification {
    return {
      subject: 'فعالیت تأیید شد',
      body: `درخواست تأیید ${activityType} «${activityTitle}» پذیرفته شد. شما ${toPersianDigits(pointValue)} نوین دریافت کردید!`,
    };
  }

  // EVT-13
  static formatVerificationRejected(
    activityType: string,
    activityTitle: string,
    rejectionReason: string,
  ): FormattedNotification {
    return {
      subject: 'درخواست تأیید فعالیت رد شد',
      body: `درخواست تأیید ${activityType} «${activityTitle}» رد شد. دلیل: ${rejectionReason}`,
    };
  }

  // EVT-14
  static formatActivityBan(
    activityTitle: string,
    bannedUntil: Date | string,
  ): FormattedNotification {
    const bannedUntilDate = formatPersianDate(bannedUntil);
    return {
      subject: 'محدودیت موقت ثبت فعالیت',
      body: `درخواست شما برای فعالیت «${activityTitle}» ۳ بار رد شده است. به همین دلیل، تا ${bannedUntilDate} امکان ثبت درخواست جدید برای این فعالیت را ندارید.`,
    };
  }

  // EVT-15
  static formatActivityUnblock(activityTitle: string): FormattedNotification {
    return {
      subject: 'امکان ثبت فعالیت دوباره فعال شد',
      body: `مدیر، امکان ثبت درخواست برای فعالیت «${activityTitle}» را دوباره برای شما فعال کرده است.`,
    };
  }

  // EVT-16
  static formatPointAwarded(
    teacherName: string,
    amount: number,
    taskName: string,
  ): FormattedNotification {
    return {
      subject: 'نوین دریافت کردید',
      body: `معلم ${teacherName} برای فعالیت «${taskName}» به شما ${toPersianDigits(amount)} نوین داد.`,
    };
  }

  // EVT-17
  static formatPointAdjusted(amount: number, reason: string): FormattedNotification {
    return {
      subject: 'موجودی نوین شما تغییر کرد',
      body: `مدیر موجودی نوین شما را به میزان ${toPersianDigits(amount)} نوین تغییر داد. دلیل: ${reason}`,
    };
  }

  // EVT-18
  static formatPointAllocated(amount: number, newBalance: number): FormattedNotification {
    return {
      subject: 'نوین به موجودی شما اضافه شد',
      body: `مدیر ${toPersianDigits(amount)} نوین به بودجهٔ نوین‌دهی شما اختصاص داد. موجودی قابل‌استفادهٔ جدید شما ${toPersianDigits(newBalance)} نوین است.`,
    };
  }
}
