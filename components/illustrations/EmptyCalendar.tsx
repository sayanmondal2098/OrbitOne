import React from 'react';
import Svg, { Circle, Rect, Line, Text as SvgText, G } from 'react-native-svg';

interface EmptyCalendarProps {
  width?: number;
  height?: number;
}

export default function EmptyCalendar({ width = 200, height = 200 }: EmptyCalendarProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      {/* Background */}
      <Circle cx="100" cy="100" r="90" fill="#FFF5F0" opacity="0.5" />
      
      {/* Calendar grid */}
      <G transform="translate(50, 40)">
        {/* Calendar frame */}
        <Rect x="0" y="0" width="100" height="100" fill="none" stroke="#F093FB" strokeWidth="2" rx="8" />
        
        {/* Title bar */}
        <Rect x="0" y="0" width="100" height="20" fill="#F093FB" opacity="0.2" rx="8" />
        <SvgText x="50" y="14" textAnchor="middle" fontFamily="Arial" fontSize="8" fill="#F093FB" fontWeight="bold">
          Feb
        </SvgText>
        
        {/* Grid lines */}
        <Line x1="0" y1="20" x2="100" y2="20" stroke="#F093FB" strokeWidth="1" opacity="0.3" />
        <Line x1="20" y1="20" x2="20" y2="100" stroke="#F093FB" strokeWidth="0.5" opacity="0.2" />
        <Line x1="40" y1="20" x2="40" y2="100" stroke="#F093FB" strokeWidth="0.5" opacity="0.2" />
        <Line x1="60" y1="20" x2="60" y2="100" stroke="#F093FB" strokeWidth="0.5" opacity="0.2" />
        <Line x1="80" y1="20" x2="80" y2="100" stroke="#F093FB" strokeWidth="0.5" opacity="0.2" />
        
        {/* Sample dates */}
        <Circle cx="30" cy="35" r="3" fill="#F5576C" opacity="0.6" />
        <Circle cx="50" cy="55" r="3" fill="#F5576C" />
        <Circle cx="70" cy="75" r="3" fill="#F5576C" opacity="0.4" />
      </G>
      
      {/* Text */}
      <SvgText x="100" y="165" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#F093FB" fontWeight="bold">
        No Events
      </SvgText>
    </Svg>
  );
}
