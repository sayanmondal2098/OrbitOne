import React from 'react';
import Svg, { Circle, Ellipse, Path, Text as SvgText, G } from 'react-native-svg';

interface EmptyHabitsProps {
  width?: number;
  height?: number;
}

export default function EmptyHabits({ width = 200, height = 200 }: EmptyHabitsProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      {/* Background */}
      <Circle cx="100" cy="100" r="90" fill="#F0FFF4" opacity="0.5" />
      
      {/* Flame/Fire */}
      <G transform="translate(100, 60)">
        {/* Outer flame glow */}
        <Ellipse cx="0" cy="0" rx="25" ry="35" fill="#43E97B" opacity="0.15" />
        
        {/* Main flame */}
        <Path d="M 0 -30 Q -15 -10 -15 10 Q -15 30 0 35 Q 15 30 15 10 Q 15 -10 0 -30" fill="#43E97B" />
        
        {/* Inner flame highlight */}
        <Path d="M 0 -20 Q -8 -5 -8 10 Q -8 22 0 25 Q 8 22 8 10 Q 8 -5 0 -20" fill="#38F9D7" opacity="0.7" />
        
        {/* Sparkle */}
        <Circle cx="-8" cy="-5" r="2" fill="#FFF" />
      </G>
      
      {/* Streak counter */}
      <G transform="translate(100, 130)">
        <Circle cx="0" cy="0" r="20" fill="#43E97B" opacity="0.2" />
        <SvgText x="0" y="6" textAnchor="middle" fontFamily="Arial" fontSize="18" fill="#43E97B" fontWeight="bold">
          0
        </SvgText>
      </G>
      
      {/* Text */}
      <SvgText x="100" y="180" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#43E97B" fontWeight="bold">
        Start a Streak!
      </SvgText>
    </Svg>
  );
}
