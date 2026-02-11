# Gamified Scrum System Rules

## Scrum Task Lifecycle
- **Mark as Done**: Users (Assignees) cannot directly complete tasks. instead, they "Mark as Done".
    - This transitions the task to `'PENDING_REVIEW'`.
    - A comment/proof must be provided.
- **Admin Review**: Only Admins can transition a task from `'PENDING_REVIEW'` to `'DONE'`.
- **Completion**: 
    - When a task is marked `'DONE'` by an Admin, the Boss takes damage and Assignees fetch XP.
- **Side Quests**: Side quests follow the same lifecycle (Mark as Done -> Pending Review -> Admin Complete).

## Collaboration
- **Multiple Assignees**: Tasks can be assigned to multiple users.
- **Notifications**: When a user is added to a task that already has assignees, a "Friend has joined!" notification is triggered.

## UI Metrics
- **Main Quests**: Show "Damage Dealt" (e.g., 50 DMG) as the primary reward metric.
- **Side Quests**: Show "XP" as the primary reward metric.
