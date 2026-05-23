export const avatarPresets = [
  { id: 'face-1', label: 'Aqua', initials: 'A', colors: ['#0f766e', '#14b8a6'] },
  { id: 'face-2', label: 'Coral', initials: 'C', colors: ['#be123c', '#fb7185'] },
  { id: 'face-3', label: 'Indigo', initials: 'I', colors: ['#4338ca', '#818cf8'] },
  { id: 'face-4', label: 'Amber', initials: 'M', colors: ['#b45309', '#f59e0b'] },
  { id: 'face-5', label: 'Slate', initials: 'S', colors: ['#334155', '#64748b'] }
];

export const logoPresets = [
  { id: 'logo-1', label: 'Queue', initials: 'Q', colors: ['#184f45', '#2dd4bf'] },
  { id: 'logo-2', label: 'Care', initials: 'C', colors: ['#1d4ed8', '#38bdf8'] },
  { id: 'logo-3', label: 'Serve', initials: 'S', colors: ['#7c2d12', '#fb923c'] },
  { id: 'logo-4', label: 'Flow', initials: 'F', colors: ['#581c87', '#c084fc'] }
];

const presetById = (presets, id) => presets.find((preset) => preset.id === id) || presets[0];

export const getAvatarPreset = (id) => presetById(avatarPresets, id);

export const getLogoPreset = (id) => presetById(logoPresets, id);

export const presetStyle = (preset) => ({
  background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`
});

export const initialsFor = (name, fallback = 'U') => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};
