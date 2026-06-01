# Carpool Auto Expand Run

You are running as a scheduled maintenance and product-expansion pass for the Carpool Optimizer repository.

Goal: make one small, coherent improvement that expands both the UI surface and the persistence/database layer.

Operating rules:
- Preserve all existing user work. Never use destructive git commands.
- Read the current code before editing and follow the existing Next.js, React, TypeScript, Tailwind, and Vitest patterns.
- Keep the change bounded to one product increment per run. Avoid broad redesigns.
- Treat the current localStorage modules as the app database unless the repository already has a real database layer. Add a real database only when the feature requires it, and include schema/migration/tests/docs in the same run.
- A good run pairs visible UI with stored data, for example saved route metadata, rider groups, trip defaults, progress, scheduling, reminders, filters, history, import/export, or route analytics.
- Do not store API keys, raw ORS responses, or secrets in saved routes or profile storage.
- Add or update focused tests for persistence and pure logic changes.
- Run `npm run typecheck` and `npm test` when feasible. If a verification command fails, fix the issue or leave a clear final note explaining the blocker.
- Do not commit automatically. Leave the working tree ready for human review.

Before making changes, inspect the current dirty worktree and avoid overwriting unrelated edits.

Final response requirements:
- Summarize the product increment.
- List files changed.
- Report verification commands and results.
