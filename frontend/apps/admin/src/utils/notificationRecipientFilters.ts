import { toAsciiDigits } from "@student-reward/shared";
import { NO_CLASS_FILTER, NO_GRADE_FILTER } from "./classGradeFilters";

export type NotificationRecipientRole = "STUDENT" | "TEACHER";

export interface NotificationRecipient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  role: NotificationRecipientRole;
  className?: string | null;
  gradeLevel?: string | null;
}

export function filterNotificationRecipients(
  recipients: NotificationRecipient[],
  role: NotificationRecipientRole,
  searchQuery: string,
  classFilter: string,
  gradeFilter: string,
): NotificationRecipient[] {
  const query = normalizeSearch(searchQuery);

  return recipients.filter((recipient) => {
    if (recipient.role !== role) return false;

    if (role === "STUDENT") {
      const className = recipient.className?.trim() || "";
      const gradeLevel = recipient.gradeLevel?.trim() || "";
      const matchesClass =
        !classFilter ||
        (classFilter === NO_CLASS_FILTER
          ? !className
          : className === classFilter);
      const matchesGrade =
        !gradeFilter ||
        (gradeFilter === NO_GRADE_FILTER
          ? !gradeLevel
          : gradeLevel === gradeFilter);

      if (!matchesClass || !matchesGrade) return false;
    }

    if (!query) return true;

    const name = normalizeSearch(
      `${recipient.firstName} ${recipient.lastName}`,
    );
    return (
      name.includes(query) ||
      toAsciiDigits(recipient.nationalId).includes(
        toAsciiDigits(searchQuery).trim(),
      )
    );
  });
}

function normalizeSearch(value: string): string {
  return toAsciiDigits(value).toLowerCase().trim();
}
