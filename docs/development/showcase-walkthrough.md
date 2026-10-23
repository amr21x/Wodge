# Revived showcase walkthrough

[Develop Wodge](README.md) · [Verification record](documentation-verification.md)

This is a manual verification procedure, not a passing result. Record the commit, environment, account roles, observations and Pass/Fail/Unverified for each journey. Use synthetic content and separate browser sessions. The [capstone video](https://youtu.be/IBZvqOu6Xro) is historical and may show features that are unavailable today.

1. Start using [local setup](setup.md). Complete Google and GitHub sign-in, onboarding and workspace creation. No email/OTP flow should appear. Verify signed-out protected links return to the intended route after sign-in.
2. Open the workspace in two independent sessions. Send/edit/delete a room message and create a discussion/comment/poll. Confirm changes arrive in the other session and survive reload.
3. Create a page, type concurrently in both sessions, reconnect after a short offline edit and confirm convergence. Insert a tasks board, add a column/task, switch table/Kanban views and reload. Removing a view must not delete its underlying page-owned tasks.
4. With a second user, test an invitation, scoped role assignment/removal and viewer write denial. Revoke access while the page is open; confirm later updates are denied. Single-user/two-session collaboration does not establish this permission journey.
5. Interrupt the backend, then restore it. Check retry feedback and pending work without clearing browser storage. Sign out with another tab open and confirm protected content/editing close; pending work must not be presented as acknowledged.
6. In partial mode without providers, verify upload/billing feedback clearly reports disabled/unavailable behavior. Calls, MCP, resource libraries and hosted generation must remain unavailable. Do not enable flags to claim an absent capability works.
7. Only with configured storage and flags, upload a harmless file/avatar and verify authorized access. With configured Polar sandbox settings, have an administrator check out using test payment data, verify signed webhook entitlement, and open the purchaser portal. Another administrator must not access that portal. Checkout redirect alone is insufficient.
8. For an authorized deployed candidate, verify routing, OAuth callbacks, health, two-session collaboration and configured integrations at the exact deployed revision. Liveness alone is insufficient for a demo claim. Add a demo link only after this verification is recorded.

Keep credentials, cookies, signed URLs and private content out of screenshots/logs. The [smoke matrix](smoke-test-matrix.md) supplies deeper scenarios. [Recovery guidance](setup.md#limits-and-recovery) covers data and provider limits.
