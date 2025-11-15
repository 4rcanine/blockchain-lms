// app/(educator)/layout.tsx

import React from 'react';
import Link from 'next/link';

// You can add educator-specific UI/authentication logic here if needed.
// For now, this minimal component is enough to fix the routing.

export default function EducatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Optional: Add a small navigation bar specific to the educator area
    <div className="educator-wrapper">
      <h1 className="text-2xl font-bold mb-4">Educator Portal</h1>
      {/* The main page content (enrollments/manage) will render here */}
      {children}
    </div>
  );
}