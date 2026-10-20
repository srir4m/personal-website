/**
 * Engraved globe surface: parchment, paper grain, hatched land, hatched night side, cyan
 * rim. As the camera dollies in (uMap 0 → 1) it turns into the descent map's palette, light
 * parchment land over hatched water, with no night side or rim, so the handoff to the
 * map dissolves between two frames in the same tones.
 */
export const globeVertex = /* glsl */ `
  varying vec3 vObjectNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main() {
    vObjectNormal = normalize(position);
    vViewNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const globeFragment = /* glsl */ `
  #define PI 3.141592653589793
  uniform sampler2D uLand;
  uniform vec3 uSun;
  uniform float uHatch;
  uniform float uPixelRatio;
  uniform vec3 uParchment;
  uniform vec3 uSepia;
  uniform vec3 uInk;
  uniform vec3 uCyan;
  uniform vec3 uWater;
  uniform float uMap;
  varying vec3 vObjectNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // 1 on a hatch line, 0 between: lines every 'spacing' CSS px, about 1.2 px wide.
  float hatch(float coordinate, float spacing) {
    float d = abs(fract(coordinate / spacing) - 0.5) * spacing;
    return 1.0 - smoothstep(0.35, 0.95, d);
  }

  void main() {
    vec3 n = normalize(vObjectNormal);
    vec2 uv = vec2(atan(n.x, n.z) / (2.0 * PI) + 0.5, asin(clamp(n.y, -1.0, 1.0)) / PI + 0.5);
    float land = texture2D(uLand, uv).r;

    vec2 px = gl_FragCoord.xy / uPixelRatio;
    float diagonal = hatch(px.x + px.y, 4.5);
    float cross = hatch(px.x - px.y, 6.0);

    vec3 color = uParchment + (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.045;

    // Land: screen-space hatching, or a flat wash on phones (PRD §10.2).
    float landInk = land * mix(0.32, diagonal * 0.8, uHatch);
    color = mix(color, uSepia, landInk);

    // Night side: a soft cross-hatched shadow past the terminator.
    float night = smoothstep(0.08, -0.22, dot(n, uSun));
    color = mix(color, uInk, night * mix(0.12, cross * 0.28 + 0.05, uHatch));

    // A thin Fresnel rim in HUD cyan.
    float facing = max(dot(normalize(vViewNormal), normalize(-vViewPosition)), 0.0);
    color = mix(color, uCyan, pow(1.0 - facing, 4.0) * 0.35);

    // The descent map's palette: parchment land, water tinted and hatched in sepia.
    vec3 mapColor = mix(uWater, uParchment, land) + (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.03;
    mapColor = mix(mapColor, uSepia, (1.0 - land) * hatch(px.x - px.y, 6.0) * 0.3);
    color = mix(color, mapColor, uMap);

    gl_FragColor = vec4(color, 1.0);
  }
`;
