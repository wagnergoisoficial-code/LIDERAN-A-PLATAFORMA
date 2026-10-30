import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '16px', className }) => (
  <div
    className={`skeleton${className ? ` ${className}` : ''}`}
    style={{ width, height, display: 'block', flexShrink: 0 }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px' }}>
    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
      <Skeleton width="40px" height="40px" className="avatar-circle" />
      <div style={{ flex: 1 }}>
        <Skeleton width="140px" height="13px" />
        <div style={{ marginTop: '6px' }}><Skeleton width="80px" height="11px" /></div>
      </div>
    </div>
    <Skeleton height="13px" />
    <div style={{ marginTop: '6px' }}><Skeleton width="80%" height="13px" /></div>
    <div style={{ marginTop: '6px' }}><Skeleton width="60%" height="13px" /></div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skeleton width="36px" height="36px" className="avatar-circle" />
        <div style={{ flex: 1 }}>
          <Skeleton width="50%" height="13px" />
          <div style={{ marginTop: '5px' }}><Skeleton width="30%" height="11px" /></div>
        </div>
      </div>
    ))}
  </>
);

export default Skeleton;
