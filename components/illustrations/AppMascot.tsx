import React from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop, Text as SvgText, G } from 'react-native-svg';

interface AppMascotProps {
  width?: number;
  height?: number;
}

export default function AppMascot({ width = 200, height = 200 }: AppMascotProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      {/* Background gradient circle */}
      <Defs>
        <RadialGradient id="orbitGradient" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#6366F1" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
        </RadialGradient>
      </Defs>
      
      <Circle cx="100" cy="100" r="85" fill="url(#orbitGradient)" />
      
      {/* Orbiting planets/spheres */}
      <G transform="translate(100, 100)">
        {/* Orbit path 1 */}
        <Circle cx="0" cy="0" r="50" fill="none" stroke="#6366F1" strokeWidth="1" opacity="0.2" strokeDasharray="5,5" />
        
        {/* Planet 1 (top) */}
        <Circle cx="0" cy="-50" r="8" fill="#667EEA" />
        <Circle cx="0" cy="-50" r="5" fill="#6366F1" opacity="0.7" />
        
        {/* Orbit path 2 */}
        <Circle cx="0" cy="0" r="65" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.2" strokeDasharray="5,5" />
        
        {/* Planet 2 (right) */}
        <Circle cx="65" cy="0" r="6" fill="#F093FB" />
        <Circle cx="65" cy="0" r="3" fill="#EC4899" opacity="0.7" />
        
        {/* Orbit path 3 */}
        <Circle cx="0" cy="0" r="40" fill="none" stroke="#764BA2" strokeWidth="1" opacity="0.2" strokeDasharray="5,5" />
        
        {/* Planet 3 (bottom-left) */}
        <Circle cx="-35" cy="25" r="7" fill="#43E97B" />
        <Circle cx="-35" cy="25" r="4" fill="#38F9D7" opacity="0.7" />
        
        {/* Central nucleus */}
        <Circle cx="0" cy="0" r="12" fill="#6366F1" />
        <Circle cx="0" cy="0" r="8" fill="#8B5CF6" opacity="0.8" />
        <Circle cx="-3" cy="-3" r="3" fill="#FFF" opacity="0.5" />
      </G>
      
      {/* Text */}
      <SvgText x="100" y="180" textAnchor="middle" fontFamily="Arial" fontSize="16" fill="#6366F1" fontWeight="bold">
        OrbitOne
      </SvgText>
    </Svg>
  );
}
