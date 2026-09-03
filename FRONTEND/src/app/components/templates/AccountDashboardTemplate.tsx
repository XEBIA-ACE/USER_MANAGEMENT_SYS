'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface AccountDashboardTemplateProps {
  children?: ReactNode;
  activeSection?: string;
}

export function AccountDashboardTemplate({
  children,
  activeSection,
}: AccountDashboardTemplateProps) {
  const router = useRouter();

  const navItems = [
    {
      label: 'Profile',
      href: '/account/profile',
      section: 'profile',
    },
    {
      label: 'Change Password',
      href: '/account/change-password',
      section: 'change-password',
    },
    {
      label: 'Delete Account',
      href: '/account/delete',
      section: 'delete',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Account Settings</h1>
        <div className="flex flex-col sm:flex-row gap-6">
          <nav className="w-full sm:w-64 flex-shrink-0">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeSection === item.section;
                return (
                  <li key={item.section}>
                    <Link
                      href={item.href}
                      className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <main className="flex-1 bg-white rounded-lg shadow p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default AccountDashboardTemplate;