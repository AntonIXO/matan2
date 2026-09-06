import { useEffect, useState } from 'react';
export function useSmallScreen() {
  const [small, setSmall] = useState(() => matchMedia('(max-width:760px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width:760px)'),
      on = () => setSmall(media.matches);
    media.addEventListener('change', on);
    return () => media.removeEventListener('change', on);
  }, []);
  return small;
}
