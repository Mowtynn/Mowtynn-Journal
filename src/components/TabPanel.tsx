import React from 'react';

interface TabPanelProps {
  isActive: boolean;
  visited: boolean;
  className?: string;
  children: React.ReactNode;
}

export const TabPanel = React.memo(function TabPanel({
  isActive,
  visited,
  className = '',
  children,
}: TabPanelProps) {
  if (!visited) return null;

  return (
    <div
      role="tabpanel"
      aria-hidden={!isActive}
      className={`${isActive ? 'block tab-enter-animation' : 'hidden'} ${className}`}
      style={{
        contentVisibility: isActive ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>
  );
});
