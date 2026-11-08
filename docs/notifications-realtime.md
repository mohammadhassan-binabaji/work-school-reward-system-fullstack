# Real-time and Android Push Notifications

The notification table and existing REST API remain the source of truth. After a notification is saved, the backend sends an SSE event to connected sessions for that recipient and sends an FCM push to registered student Android installations. SSE and FCM are best-effort delivery channels; clients reconcile from the REST inbox and unread-count endpoints.

## End-to-end behavior

1. A business operation completes and emits its existing NestJS domain event.
2. The notification listener creates the persistent notification record.
3. After the database write succeeds, the backend publishes the notification ID to that user's connected SSE sessions.
4. If the recipient has registered Android installation tokens, the backend sends an FCM notification containing the saved subject and body. FCM displays it in the Android notification tray when the app is backgrounded or closed.
5. An active frontend refreshes the unread count; if the inbox is open, it reloads page one from REST.
6. Tapping the Android system notification opens the app's notification inbox. The inbox fetches notification data from REST.

There is no delivery queue or retry worker. If a live connection or FCM send fails, the notification remains in the inbox and is available on the next REST refresh. FCM may deliver late, more than once, or not at all.

## Firebase and Android setup

### Firebase project

1. Create or select a Firebase project and enable Firebase Cloud Messaging / the FCM HTTP v1 API.
2. Add an Android app using the package ID configured by `VITE_ANDROID_APP_ID` in `frontend/.env`.
3. Download that app's `google-services.json` and place it at:

   ```text
   frontend/apps/student/android/app/google-services.json
   ```

   This file is environment-specific and must not be committed. The Android Gradle project already applies the Google Services plugin when this file exists.

4. Create a Firebase service account for the backend and make its credentials available to the backend process. Do not put service-account credentials in the frontend or source control.

### Backend configuration

Set these environment variables for the NestJS process:

```text
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id
```

`GOOGLE_APPLICATION_CREDENTIALS` is consumed by Firebase Admin SDK Application Default Credentials. In containers, mount the credential file as a read-only secret and set the variable to its container path. `FIREBASE_PROJECT_ID` should match the project used by the Android app. If credentials are not configured, the backend starts normally but logs that FCM delivery is disabled; in-app SSE and REST continue to work.

### Build and install Android

From `frontend/`, build the student web assets and sync Capacitor:

```powershell
npm run cap:build:student
```

Install the resulting Android app on a device with Google Play services. On Android 13 and later, the app requests notification permission after an authenticated student session is established. If permission is denied, the inbox and foreground SSE still work, but Android system alerts are not shown.

## Device token lifecycle

- After permission is granted, the app obtains an FCM registration token and sends it to the authenticated `STUDENT` API session.
- The backend associates each unique token with one student; one student can register multiple device tokens.
- The app registers refreshed FCM tokens as they arrive.
- On logout, the app asks the backend to remove the current installation's token and then deletes the local FCM token. If offline, unregistering may fail; the next authenticated login re-registers the token.
- Invalid or expired tokens reported by FCM are removed by the backend.
- Deleting a user also deletes that user's registered device records.

## Push content and interaction

Push messages contain the saved notification's full subject and body, as selected for this project. Those contents may be visible on a locked screen; do not include passwords, authentication tokens, or other credentials in notification text.

The data portion includes the persistent notification ID and the fixed `/notifications` route. The client does not navigate to a server-provided arbitrary URL. The current behavior opens the inbox, which fetches authoritative data from the authenticated REST API.

On Android, the app creates the `student-notifications` notification channel and the backend targets that channel. The operating system displays FCM notification payloads while the app is backgrounded or terminated. While the app is in the foreground, the connected SSE channel updates the in-app badge and inbox; the app does not show a second local system alert for the same event.

## SSE and connection behavior

The authenticated endpoint is `GET /api/v1/notifications/events`. It sends a notification ID event and periodic heartbeats. Each connection is scoped to the user identity established by the existing cookie or bearer-session authentication; the client cannot select another recipient.

The clients use fetch-based SSE so Android can send its existing bearer session header. The browser continues to use its session cookie. On disconnect, clients reconnect with backoff and refresh the unread count; when the inbox is open, they reload it from REST.

The SSE connection registry is in memory and targets the current single backend instance. If the backend is later run on multiple instances, shared pub/sub will be needed to forward events to connections held by other instances. Ensure any reverse proxy in front of the API permits long-lived streaming responses and does not buffer the SSE endpoint.

## Quick verification

1. Configure Firebase credentials and `google-services.json`, then apply backend migrations and rebuild/sync the student Android app.
2. Log in as a student on an Android 13+ device and allow notification permission.
3. Confirm `POST /api/v1/notifications/push-devices` succeeds for the authenticated student and that the token appears in `push_devices`.
4. Trigger an existing business action that creates a notification for that student.
5. With the app open, confirm the badge changes promptly and the inbox reloads if open.
6. Background or close the app, trigger another notification, and confirm the Android notification displays its saved subject/body.
7. Tap the alert and confirm the app opens `/notifications` and loads the persistent inbox.
8. Log out and confirm that device token is removed from the student's registrations.
