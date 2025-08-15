# Testing & Coverage Checklist

## E2E (suggested with Playwright)
- Team Lead login → dashboard KPIs visible
- Team page loads members and CSV export works
- Live page shows statuses; reconnect toggles connection
- Performance page loads charts; date filters update data
- Quality page create score → appears in list
- Training page create assignment → appears in list
- Communications broadcast → notifications appear for members

## Integration
- /api/teams/by-lead returns teams
- /api/teams/{id}/members, live-status, queue-status return data
- /api/performance-metrics/team/{teamId} aggregates correctly
- /api/quality-scores GET/POST works with filters
- /api/notifications endpoints create/read/mark-all-read

## Auth Scenarios
- Admin-only endpoints reject non-admins
- Team lead can access own team data, not others
- Unauthenticated requests return 401

## Performance
- Add indexes if slow:
  - teams(team_lead_id), team_assignments(team_id, is_active)
  - performance_metrics(employee_id, date)
  - employees(role, team_id)
- Consider caching recent team snapshots for live/queue
