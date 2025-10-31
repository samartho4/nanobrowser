import React from 'react';

interface AutonomyBadgeProps {
  level: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AutonomyBadge: React.FC<AutonomyBadgeProps> = ({
  level,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const getAutonomyInfo = (autonomyLevel: number) => {
    switch (autonomyLevel) {
      case 1:
        return {
          label: 'Ask First',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          dotColor: 'bg-yellow-500',
          description: 'Always ask before any action',
        };
      case 2:
        return {
          label: 'Cautious',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          dotColor: 'bg-yellow-500',
          description: 'Ask for most actions',
        };
      case 3:
        return {
          label: 'Balanced',
          color: 'text-teal-400',
          bgColor: 'bg-teal-500/20',
          dotColor: 'bg-teal-500',
          description: 'Ask for sensitive actions',
        };
      case 4:
        return {
          label: 'Confident',
          color: 'text-teal-400',
          bgColor: 'bg-teal-500/20',
          dotColor: 'bg-teal-500',
          description: 'Act unless risky',
        };
      case 5:
        return {
          label: 'Autonomous',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          dotColor: 'bg-green-500',
          description: 'Act independently',
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          dotColor: 'bg-gray-500',
          description: 'Unknown autonomy level',
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1',
          text: 'text-xs',
          dot: 'w-1.5 h-1.5',
        };
      case 'lg':
        return {
          container: 'px-3 py-2',
          text: 'text-sm',
          dot: 'w-3 h-3',
        };
      default: // md
        return {
          container: 'px-2.5 py-1.5',
          text: 'text-xs',
          dot: 'w-2 h-2',
        };
    }
  };

  const autonomyInfo = getAutonomyInfo(level);
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={`inline-flex items-center space-x-1.5 rounded-full ${autonomyInfo.bgColor} ${sizeClasses.container} ${className}`}
      title={`${autonomyInfo.label} (Level ${level}): ${autonomyInfo.description}`}>
      <div className={`${sizeClasses.dot} rounded-full ${autonomyInfo.dotColor}`} />
      {showLabel && (
        <span className={`font-medium ${autonomyInfo.color} ${sizeClasses.text}`}>{autonomyInfo.label}</span>
      )}
    </div>
  );
};
