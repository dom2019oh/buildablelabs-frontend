/**
 * BACKGROUND LIBRARY
 * CSS background patterns for AI generation.
 */

export interface BackgroundTemplate {
  id: string;
  name: string;
  category: 'gradient' | 'animated' | 'mesh' | 'pattern' | 'aurora';
  className: string;
  style?: Record<string, string>;
}

export const BACKGROUND_LIBRARY: BackgroundTemplate[] = [
  // Gradients
  {
    id: 'purple-pink',
    name: 'Purple Pink',
    category: 'gradient',
    className: 'bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    category: 'gradient',
    className: 'bg-gradient-to-br from-blue-900 via-zinc-900 to-cyan-900',
  },
  {
    id: 'emerald-teal',
    name: 'Emerald Teal',
    category: 'gradient',
    className: 'bg-gradient-to-br from-emerald-900 via-zinc-900 to-teal-900',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'gradient',
    className: 'bg-gradient-to-br from-orange-900 via-red-900 to-pink-900',
  },
  // Mesh
  {
    id: 'mesh-gradient',
    name: 'Mesh Gradient',
    category: 'mesh',
    className: '',
    style: {
      background:
        'radial-gradient(at 40% 20%, hsla(288,80%,42%,0.5) 0px, transparent 50%), ' +
        'radial-gradient(at 80% 0%, hsla(340,80%,42%,0.4) 0px, transparent 50%), ' +
        'radial-gradient(at 0% 50%, hsla(220,80%,50%,0.3) 0px, transparent 50%), ' +
        'radial-gradient(at 80% 100%, hsla(180,80%,40%,0.3) 0px, transparent 50%)',
      backgroundColor: '#0a0a0a',
    },
  },
  // Patterns
  {
    id: 'dot-pattern',
    name: 'Dot Pattern',
    category: 'pattern',
    className: 'bg-zinc-900',
    style: {
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
  },
  {
    id: 'grid-pattern',
    name: 'Grid Pattern',
    category: 'pattern',
    className: 'bg-zinc-900',
    style: {
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), ' +
        'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
      backgroundSize: '30px 30px',
    },
  },
];

export function getBackgroundsByCategory(category: BackgroundTemplate['category']) {
  return BACKGROUND_LIBRARY.filter((b) => b.category === category);
}

export function getBackgroundById(id: string) {
  return BACKGROUND_LIBRARY.find((b) => b.id === id);
}
