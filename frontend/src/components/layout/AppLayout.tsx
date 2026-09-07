import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import type { Project } from '../../types';
import { getAssets, getAttackPaths, getFindings, getProjects, getScans, getStoredUser } from '../../lib/api';
import { mockAssets, mockAttackPaths, mockFindings, mockProjects, mockScans, mockUsers } from '../../data/mockData';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const storedUser = getStoredUser();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProject, setSelectedProject] = useState<Project>(mockProjects[0]);
  const [dataVersion, setDataVersion] = useState(0);

  const currentUser = storedUser || mockUsers[0];

  useEffect(() => {
    getProjects().then(items => {
      if (items.length) {
        setProjects(items);
        setSelectedProject(items[0]);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedProject?.id) return;
    Promise.all([
      getAssets(selectedProject.id),
      getScans(selectedProject.id),
      getFindings(selectedProject.id),
      getAttackPaths(selectedProject.id),
    ]).then(([assets, scans, findings, paths]) => {
      mockAssets.splice(0, mockAssets.length, ...assets);
      mockScans.splice(0, mockScans.length, ...scans);
      mockFindings.splice(0, mockFindings.length, ...findings);
      mockAttackPaths.splice(0, mockAttackPaths.length, ...paths);
      setDataVersion(version => version + 1);
    }).catch(() => undefined);
  }, [selectedProject]);

  if (!storedUser) return <Navigate to="/login" replace />;

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
          projects={projects}
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
          user={{ name: currentUser.name, email: currentUser.email, role: currentUser.role }}
          onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ selectedProject, dataVersion }} />
        </main>
      </div>
    </div>
  );
};
