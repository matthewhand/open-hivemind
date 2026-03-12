import React from 'react';
export const Card: React.FC<any> & { Body: React.FC<any>, Title: React.FC<any>, Actions: React.FC<any> } = Object.assign(() => <div />, { Body: () => <div />, Title: () => <div />, Actions: () => <div /> });
export default Card;
