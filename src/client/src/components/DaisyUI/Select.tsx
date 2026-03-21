import React from 'react';
export const Select: React.FC<any> = () => <select />;
export default Select;

export interface SelectOption { value: string | number; label: string; }