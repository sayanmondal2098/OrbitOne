import React from 'react';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  G,
  Line,
} from 'react-native-svg';

interface WelcomeIllustrationProps {
  width?: number;
  height?: number;
}

export default function WelcomeIllustration({ width = 120, height = 120 }: WelcomeIllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120">
      <Defs>
        {/* Ambient outer glow */}
        <RadialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </RadialGradient>

        {/* Planet core gradient */}
        <RadialGradient id="planetGrad" cx="38%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#A78BFA" />
          <Stop offset="45%" stopColor="#6366F1" />
          <Stop offset="100%" stopColor="#312E81" />
        </RadialGradient>

        {/* Planet highlight */}
        <RadialGradient id="highlight" cx="35%" cy="32%" r="40%">
          <Stop offset="0%" stopColor="#FFF" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#FFF" stopOpacity="0" />
        </RadialGradient>

        {/* Orbit ring gradient */}
        <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.1" />
          <Stop offset="40%" stopColor="#A78BFA" stopOpacity="0.9" />
          <Stop offset="60%" stopColor="#818CF8" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.1" />
        </LinearGradient>
      </Defs>

      {/* Outer ambient glow */}
      <Circle cx="60" cy="60" r="58" fill="url(#outerGlow)" />

      {/* Orbit ring — tilted ellipse behind planet */}
      <Ellipse
        cx="60"
        cy="60"
        rx="50"
        ry="14"
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="2.5"
        rotation="-18"
        originX="60"
        originY="60"
        opacity="0.75"
      />

      {/* Planet core */}
      <Circle cx="60" cy="60" r="28" fill="url(#planetGrad)" />

      {/* Specular highlight on planet */}
      <Circle cx="60" cy="60" r="28" fill="url(#highlight)" />

      {/* Subtle surface band on planet */}
      <Ellipse
        cx="60"
        cy="63"
        rx="22"
        ry="6"
        fill="none"
        stroke="#818CF8"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Orbit ring — foreground arc (on top of planet) */}
      <Path
        d="M 10 64 A 50 14 0 0 0 110 60"
        fill="none"
        stroke="#C4B5FD"
        strokeWidth="2.5"
        opacity="0.85"
        strokeLinecap="round"
        rotation="-18"
        originX="60"
        originY="60"
      />

      {/* Orbiting satellite dot */}
      <Circle cx="108" cy="53" r="4" fill="#F0ABFC" opacity="0.95" />
      <Circle cx="108" cy="53" r="7" fill="#F0ABFC" opacity="0.18" />

      {/* Star 1 */}
      <Circle cx="18" cy="22" r="1.8" fill="#E0E7FF" opacity="0.9" />
      {/* Star 2 */}
      <Circle cx="98" cy="16" r="1.4" fill="#C4B5FD" opacity="0.8" />
      {/* Star 3 */}
      <Circle cx="14" cy="90" r="1.2" fill="#A5F3FC" opacity="0.7" />
      {/* Star 4 */}
      <Circle cx="103" cy="95" r="1.6" fill="#E0E7FF" opacity="0.75" />
      {/* Star 5 — tiny cross sparkle */}
      <Line x1="32" y1="30" x2="32" y2="34" stroke="#FFF" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
      <Line x1="30" y1="32" x2="34" y2="32" stroke="#FFF" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
    </Svg>
  );
}
