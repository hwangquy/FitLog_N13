# Frontend – Admin & UI

- `frontend/app/admin/`: 5 tab (Tổng quan, Người dùng, Tracking, Hoạt động, Tài khoản) + redirect `dashboard`.
- `frontend/src/components/admin/`: `AdminUI` (Panel, Kpi, Bars, State, Action, `useAdminColors`), `TrackingConsentCard`.
- `frontend/src/services/`: `admin.ts` (API admin), `tracking.ts` (đồng ý + sự kiện), `client.ts` (http có token).
- Sáng/Tối: `src/theme/colors.ts`, `tamagui.config.ts`, `hooks/useAppTheme.ts`, `store/settingsSlice.ts`, `components/ui/ThemeSwitcher.tsx`.
- `frontend/app/_layout.tsx`: provider, kiểm tra phiên, điều hướng theo vai trò, tracking.
- Cần backend có `/api/admin/*`, `/api/tracking/*`, `/api/auth/*` và màn `auth/login`, `(tabs)` do thành viên khác làm.
