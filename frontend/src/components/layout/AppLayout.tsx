import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { mockProjects, mockUsers } from '../../data/mockData';
import type { Project } from '../../types';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project>(mockProjects[0]);

  const currentUser = mockUsers[0];

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className={clsx(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60',
      )}>
        <Navbar
          projects={mockProjects}
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
          user={{ name: currentUser.name, email: currentUser.email, role: currentUser.role }}
          onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ selectedProject }} />
        </main>
      </div>
    </div>
  );
};
