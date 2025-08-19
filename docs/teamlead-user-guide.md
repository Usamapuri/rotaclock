# Team Lead User Guide

This guide explains how Team Leads use the system day-to-day.

## Access & Login
- Team Lead login: `/team-lead/login`
- Credentials: Employee ID (e.g., EMP200) and password provided by Admin
- If you see the Admin login page, use the Team Lead login instead

## Navigation Overview
- Dashboard: KPIs and quick links
- Team: Members list with search/export
- Live: Real-time presence (online/break/offline) and queue stats
- Performance: KPIs + charts with date filters
- Quality: QA score list, create new evaluations
- Training: Assign/view training items
- Communications: Send team-wide messages
- Reports: Attendance summaries and CSV export

## Dashboard
- Live counts: members, online, on break
- KPI cards: calls handled, AHT, CSAT, FCR (when metrics are present)
- Connection status shows live updates state (SSE)

## Team Overview
- Search by name/ID/email
- Export current view to CSV
- Member row shows status and activity indicators

## Live Monitoring
- Status legend: online (active shift), break, offline
- Queue stats: available agents, calls handled, estimated wait
- Refreshes automatically; use Reconnect if connection drops

## Performance
- Select a date range; view team KPI aggregates
- Charts:
  - Volume & Efficiency (Calls, AHT)
  - Quality & Resolution (CSAT, FCR)
- Click a member to inspect individual trend lines (if available)

## Quality
- Filter by date range/member
- Add score: evaluator, call ID (optional), component scores, notes
- Saved scores affect performance views

## Training
- View member assignments, status, scores
- Create assignment: title, type, due date, notes
- Mark completion and record feedback/score

## Communications
- Broadcast to team (appears in notifications)
- See recent quality/training summaries to include in messages

## Reports
- Attendance summary by date range
- KPIs: total hours, late/no-show counts, avg hours
- Export to CSV

## Role Differences
- Team Leads cannot access Admin employee management and global reports
- Admin can reassign team leads and edit teams

## Tips
- Keep browser tab open for live monitoring
- Use filters to narrow charts and tables
- For large teams, export to CSV for deeper analysis

## Troubleshooting
- Can’t log in: check Employee ID format (e.g., EMP200) and password; contact Admin
- No team data: ensure you are assigned as team lead to at least one active team
- Live not updating: click Reconnect; check network; try reloading the page
- Metrics empty: metrics appear when daily performance data exists
