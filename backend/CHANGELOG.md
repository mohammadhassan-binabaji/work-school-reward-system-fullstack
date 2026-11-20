# Changelog

## 2.3.4 - 2026-11-20

### Changed

- Fund accepted activity awards and completed proposals from the acting administrator's system pool or vice principal's personal balance.
- Record the funding source and resulting source balance in award audit entries.

### Fixed

- Keep activity verifications pending and proposals ready to do when the acting budget is insufficient.
- Prevent duplicate concurrent awards from debiting a budget or crediting a student more than once.

### Added

- Added administrator returns of unused teacher and vice-principal points to the system pool, with balance checks, audit reasons, and recipient notifications.

## 2.3.3 - 2026-11-19

### Added

- Added custom notifications for active students and teachers, with vice-principal sends restricted to active students.
- Added per-recipient notification persistence and delivery through the existing realtime and Firebase push pipeline.

## 2.3.2 - 2026-11-19

### Added

- Added nullable class names to active student adjustment candidates so the Admin and Vice Principal adjustment views can filter by class.

## 2.3.1 - 2026-11-19

### Added

- Added nullable student grade-level data to the active adjustment-candidate response so Vice Principals can filter students by grade.

## 2.3.0 - Initial implementation

- Initial implementation of the NestJS backend.
