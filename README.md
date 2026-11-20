# ShiftEase
### Employee Scheduling Management System

## 1. Project Description

ShiftEase is a web-based Employee Scheduling Management System designed to help small businesses manage employee information, work schedules, and employee availability.

## 2. Project Objectives

- Simplify employee scheduling.
- Improve schedule management.
- Reduce scheduling conflicts.
- Allow employees to communicate their availability.

## 3. Key Features

- Employee Management
- Schedule Management
- Employee Availability Management
- User Account Management
- Role Management


Managers first save a day's work period, such as 08:00–18:00, then add each employee's own shift within it. An employee available from 10:00–14:00 can cover that part of the day. Multiple employees can work at the same time, and one employee can have separate, non-overlapping blocks. The candidate list shows approved availability for the selected work date after subtracting existing assignments.

Use **Copy to…** on a date card to fill other selected dates, Monday–Friday, or the whole displayed week. Copying changes drafts only. Existing draft hours require an explicit replacement choice. **Save selected days** validates and saves the selected dates as a single transaction; it does not copy employee assignments.

The assignment panel supports adding, editing, and removing personal shifts. A coverage strip and timeline show staffing and uncovered hours. Publishing with gaps asks the manager to review them; no minimum staffing level is assumed. Editing a published work day or its employee shifts returns that day to draft and requires publishing again.

`Schedule.assignments` stores each employee, start time, and end time. The existing `employees` list remains synchronized for compatibility. Older records without assignments are read using their original hours and converted only when edited, without changing the original employee hours. No bulk migration is required. The legacy employee assignment API remains supported; new clients send `startTime` and `endTime` with `employeeId`. Individual shifts can be edited or removed through `/api/schedules/:id/assignments/:assignmentId`.

Validation: run `npm test` and `npm run build` in `frontend`. Backend integration tests use `TEST_MONGO_URI` pointing to a disposable local MongoDB replica set, followed by `npm run test:integration` in `backend`.
