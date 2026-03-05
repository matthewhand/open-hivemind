import React from 'react';

export const RobotUIProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const useRobotUI = () => ({});
export const useIsRobotUI = () => false;
export const withRobotUI = (Component: React.ComponentType) => Component;
export const RobotUIToggle = () => <div />;
