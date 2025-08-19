# Team Lead APIs

Base URL: `/api`

## Teams by Lead
- GET `/teams/by-lead?leadId={uuid}`

## Team Members
- GET `/teams/{teamId}/members`

## Live Status
- GET `/teams/{teamId}/live-status`

## Queue Status
- GET `/teams/{teamId}/queue-status`

## Performance Metrics
- GET `/performance-metrics/team/{teamId}`

## Quality Scores
- GET `/quality-scores?team_id={teamId}&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

## Training Assignments
- GET `/teams/{teamId}/training-assignments`
- POST `/teams/{teamId}/training-assignments`

Authentication: demo middleware accepts any request; production should enforce JWT/session and role checks.
