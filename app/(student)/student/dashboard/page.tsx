'use client';

// This page simply renders the shared Dashboard Logic Component.
// The actual UI and Dark Mode support is handled inside DashboardView.tsx
// The Layout (Sidebar) is handled by app/(student)/layout.tsx

import DashboardView from '@/components/DashboardView';

export default function StudentDashboardPage() {
    return <DashboardView />;
}