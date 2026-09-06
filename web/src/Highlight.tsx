import { createContext, useContext } from 'react';
export const HighlightContext = createContext({ active: '', set: (_id: string) => {} });
export const useHighlight = () => useContext(HighlightContext);
export const marks: Record<string, [string, string][]> = {
  differentiability: [
    ['linear', 'dfₐ(h) · плоскость'],
    ['error', 'r(h) · остаток'],
  ],
  staircase: [
    ['leg1', 'Δ₁ · первый участок'],
    ['leg2', 'Δ₂ · второй участок'],
  ],
  composition: [
    ['linear', 'Ah, BAh'],
    ['error', 'точное − линейное'],
  ],
  lagrange: [
    ['chord', 'v · хорда'],
    ['velocity', 'F′(t) · скорость'],
    ['projection', 'проекция'],
  ],
  gradient: [
    ['direction', 'u · направление'],
    ['gradient', '∇f · градиент'],
    ['tangent', '∂ᵤf · касательная'],
  ],
  path: [
    ['carrier', 'γ([a,b]) · носитель'],
    ['velocity', '‖dγ/du‖ · скорость'],
  ],
  'polar-length': [
    ['radial', 'ρ′eρ'],
    ['angular', 'ρeφ'],
    ['velocity', 'γ′'],
  ],
  'polar-area': [
    ['inner', 'm · вписанный сектор'],
    ['outer', 'M · описанный сектор'],
  ],
  'diameter-area': [
    ['rays', 'OA и OB'],
    ['chord', 'AB · хорда'],
  ],
  integral: [
    ['graph', 'f · график'],
    ['area', 'Φ · площадь'],
  ],
  convexity: [
    ['chord', 'хорды'],
    ['support', 'опорная прямая'],
  ],
  quadrature: [
    ['approx', 'приближение'],
    ['kernel', 'Ψ · ядро'],
  ],
  poisson: [
    ['lower', 'нижний эталон'],
    ['upper', 'верхний эталон'],
  ],
};
