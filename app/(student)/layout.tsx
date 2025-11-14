// app/(student)/layout.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarNavLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'My Profile', href: '/profile' },
    { name: 'Calendar', href: '/calendar' },
    { name: 'Course Catalog', href: '/courses' },
    { name: 'Settings', href: '/settings' },
];

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-gray-50 border-r p-6 h-screen-minus-header">
                <h2 className="text-lg font-bold mb-4">My Hub</h2>
                <nav className="space-y-2">
                    {sidebarNavLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`block px-4 py-2 rounded-md text-sm font-medium ${
                                    isActive
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    );
}