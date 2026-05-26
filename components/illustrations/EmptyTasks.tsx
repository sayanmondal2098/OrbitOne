import React from 'react';
import Svg, { Circle, Path, Text as SvgText, G } from 'react-native-svg';

interface EmptyTasksProps {
  width?: number;
  height?: number;
}

export default function EmptyTasks({ width = 200, height = 200 }: EmptyTasksProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      {/* Background circle */}
      <Circle cx="100" cy="100" r="90" fill="#F0F4FF" opacity="0.5" />
      
      <G transform="translate(100, 100)">
        {/* Large checkmark circle */}
        <Circle cx="0" cy="0" r="50" fill="none" stroke="#667EEA" strokeWidth="4" opacity="0.2" />
        
        {/* Checkmark */}
        <Path d="M -20 0 L 0 20 L 30 -15" fill="none" stroke="#667EEA" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Small decorative circles */}
        <Circle cx="-35" cy="-25" r="6" fill="#764BA2" opacity="0.3" />
        <Circle cx="40" cy="35" r="5" fill="#667EEA" opacity="0.3" />
      </G>
      
      {/* Text */}
      <SvgText x="100" y="165" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#667EEA" fontWeight="bold">
        No Tasks Yet
      </SvgText>
    </Svg>
  );
}
