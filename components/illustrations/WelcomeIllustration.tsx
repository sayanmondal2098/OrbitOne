import React from 'react';
import Svg, { Circle, Rect, Path, Text as SvgText, G } from 'react-native-svg';

interface WelcomeIllustrationProps {
  width?: number;
  height?: number;
}

export default function WelcomeIllustration({ width = 200, height = 200 }: WelcomeIllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      {/* Background */}
      <Circle cx="100" cy="100" r="90" fill="#F0F8FF" opacity="0.5" />
      
      {/* Welcome illustration */}
      <G transform="translate(100, 70)">
        {/* Person/figure */}
        {/* Head */}
        <Circle cx="0" cy="-25" r="12" fill="#667EEA" />
        
        {/* Body */}
        <Rect x="-10" y="-8" width="20" height="18" fill="#667EEA" rx="3" />
        
        {/* Arms */}
        <Rect x="-15" y="-5" width="10" height="6" fill="#667EEA" rx="3" transform="rotate(-30 -10 -2)" />
        <Rect x="5" y="-5" width="10" height="6" fill="#667EEA" rx="3" transform="rotate(30 10 -2)" />
        
        {/* Legs */}
        <Rect x="-6" y="12" width="5" height="12" fill="#764BA2" rx="2" />
        <Rect x="1" y="12" width="5" height="12" fill="#764BA2" rx="2" />
        
        {/* Smile/happy face */}
        <Circle cx="-4" cy="-28" r="1.5" fill="#FFF" />
        <Circle cx="4" cy="-28" r="1.5" fill="#FFF" />
        <Path d="M -2 -24 Q 0 -22 2 -24" fill="none" stroke="#FFF" strokeWidth="1" strokeLinecap="round" />
      </G>
      
      {/* Text */}
      <SvgText x="100" y="160" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#667EEA" fontWeight="bold">
        Welcome!
      </SvgText>
      <SvgText x="100" y="178" textAnchor="middle" fontFamily="Arial" fontSize="11" fill="#667EEA" opacity="0.7">
        Let's be productive
      </SvgText>
    </Svg>
  );
}
