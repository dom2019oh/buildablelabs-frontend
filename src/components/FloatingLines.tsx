import { useEffect, useRef } from "react";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock
} from "three";
import "./FloatingLines.css";

const vertexShader = `
precision highp float;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;
uniform float iTime;
uniform vec3 iResolution;
uniform float animationSpeed;
uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;
uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;
uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;
uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;
uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;
uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;
uniform vec3 lineGradient[8];
uniform int lineGradientCount;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 getLineColor(float t) {
  if (lineGradientCount == 1) {
    return lineGradient[0];
  }
  float clampedT = clamp(t, 0.0, 0.9999);
  float scaled = clampedT * float(lineGradientCount - 1);
  int idx = int(floor(scaled));
  int idx2 = min(idx + 1, lineGradientCount - 1);
  float f = fract(scaled);
  return mix(lineGradient[idx], lineGradient[idx2], f);
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;
  float amp = sin(offset + time * 0.2) * 0.3;
  float y = sin(uv.x + offset + time * 0.1) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    y += (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
  uv.y *= -1.0;

  if (parallax) {
    uv += parallaxOffset;
  }

  vec3 col = vec3(0.0);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; i++) {
      float t = float(i) / max(float(bottomLineCount - 1), 1.0);
      vec3 c = getLineColor(t);
      vec2 ruv = uv * rotate(bottomWavePosition.z);
      col += c * wave(
        ruv + vec2(bottomLineDistance * float(i) + bottomWavePosition.x, bottomWavePosition.y),
        1.5,
        uv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; i++) {
      float t = float(i) / max(float(middleLineCount - 1), 1.0);
      vec3 c = getLineColor(t);
      vec2 ruv = uv * rotate(middleWavePosition.z);
      col += c * wave(
        ruv + vec2(middleLineDistance * float(i) + middleWavePosition.x, middleWavePosition.y),
        2.0,
        uv,
        mouseUv,
        interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; i++) {
      float t = float(i) / max(float(topLineCount - 1), 1.0);
      vec3 c = getLineColor(t);
      vec2 ruv = uv * rotate(topWavePosition.z);
      ruv.x *= -1.0;
      col += c * wave(
        ruv + vec2(topLineDistance * float(i) + topWavePosition.x, topWavePosition.y),
        1.0,
        uv,
        mouseUv,
        interactive
      ) * 0.1;
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const MAX_GRADIENT_STOPS = 8;

function hexToVec3(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return new Vector3(r, g, b);
}

interface FloatingLinesProps {
  linesGradient: string[];
  enabledWaves?: ("top" | "middle" | "bottom")[];
  lineCount?: number;
  lineDistance?: number;
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  parallax?: boolean;
  parallaxStrength?: number;
  mixBlendMode?: string;
}

export default function FloatingLines({
  linesGradient,
  enabledWaves = ["top", "middle", "bottom"],
  lineCount = 5,
  lineDistance = 5,
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5,
  bendStrength = -0.5,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = "screen"
}: FloatingLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const uniforms: Record<string, { value: unknown }> = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3() },
      animationSpeed: { value: animationSpeed },
      enableTop: { value: enabledWaves.includes("top") },
      enableMiddle: { value: enabledWaves.includes("middle") },
      enableBottom: { value: enabledWaves.includes("bottom") },
      topLineCount: { value: lineCount },
      middleLineCount: { value: lineCount },
      bottomLineCount: { value: lineCount },
      topLineDistance: { value: lineDistance * 0.01 },
      middleLineDistance: { value: lineDistance * 0.01 },
      bottomLineDistance: { value: lineDistance * 0.01 },
      topWavePosition: { value: new Vector3(10, 0.5, -0.4) },
      middleWavePosition: { value: new Vector3(5, 0, 0.2) },
      bottomWavePosition: { value: new Vector3(2, -0.7, 0.4) },
      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },
      parallax: { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset: { value: new Vector2() },
      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3())
      },
      lineGradientCount: { value: linesGradient.length }
    };

    linesGradient.forEach((hex, i) => {
      (uniforms.lineGradient.value as Vector3[])[i].copy(hexToVec3(hex));
    });

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader
    });

    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const clock = new Clock();

    const resize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h, false);
      (uniforms.iResolution.value as Vector3).set(
        renderer.domElement.width,
        renderer.domElement.height,
        1
      );
    };

    resize();
    window.addEventListener("resize", resize);

    let animationId: number;
    const render = () => {
      uniforms.iTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [linesGradient, enabledWaves, lineCount, lineDistance, animationSpeed, interactive, bendRadius, bendStrength, parallax, parallaxStrength]);

  return (
    <div
      ref={containerRef}
      className="floating-lines-container"
      style={{ mixBlendMode: mixBlendMode as React.CSSProperties["mixBlendMode"] }}
    />
  );
}
