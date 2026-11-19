import { describe, expect, it } from "vitest";
import {
  filterNotificationRecipients,
  type NotificationRecipient,
} from "./notificationRecipientFilters";

const recipients: NotificationRecipient[] = [
  {
    id: "student-1",
    role: "STUDENT",
    firstName: "آرمان",
    lastName: "رضایی",
    nationalId: "۱۲۳۴۵۶۷۸۹۰",
    className: "هفتم ۱",
    gradeLevel: "۷",
  },
  {
    id: "teacher-1",
    role: "TEACHER",
    firstName: "مینا",
    lastName: "احمدی",
    nationalId: "٠٩٨٧٦٥٤٣٢١",
  },
];

describe("custom notification recipient filters", () => {
  it("searches names and national IDs with Persian and Arabic digits", () => {
    expect(
      filterNotificationRecipients(recipients, "STUDENT", "1234567890", "", ""),
    ).toEqual([recipients[0]]);
    expect(
      filterNotificationRecipients(recipients, "TEACHER", "۰۹۸۷۶۵۴۳۲۱", "", ""),
    ).toEqual([recipients[1]]);
    expect(
      filterNotificationRecipients(recipients, "STUDENT", "رضایی", "", ""),
    ).toEqual([recipients[0]]);
  });

  it("applies class and grade filters only to students", () => {
    expect(
      filterNotificationRecipients(recipients, "STUDENT", "", "هفتم ۱", "۷"),
    ).toEqual([recipients[0]]);
    expect(
      filterNotificationRecipients(recipients, "STUDENT", "", "هفتم ۱", "۸"),
    ).toEqual([]);
    expect(
      filterNotificationRecipients(
        recipients,
        "TEACHER",
        "",
        "unused",
        "unused",
      ),
    ).toEqual([recipients[1]]);
  });
});
