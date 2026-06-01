# Auto Expand Automation

This harness runs a bounded Codex pass that looks for one coherent UI plus persistence/database improvement in the Carpool app.

Run once:

```bash
npm run auto:expand
```

Install the 20-minute local cron schedule:

```bash
npm run auto:expand:install
```

Remove the schedule:

```bash
npm run auto:expand:uninstall
```

Runtime logs and summaries are written under `.automation/`, which is intentionally gitignored.

Notes:
- The installer modifies your user crontab, so it is kept as an explicit command instead of being run automatically from the repo setup.
- Each scheduled pass is told to make one bounded increment, preserve dirty worktree changes, update tests, and avoid automatic commits.
- In this app, the current persistence layer is browser `localStorage`; the automation treats that as the database layer unless a real database is introduced deliberately.
