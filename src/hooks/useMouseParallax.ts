import { useEffect, useState, RefObject } from 'react';

interface ParallaxValues {
  rotateX: number;
  rotateY: number;
  scale: number;
}

export const useMouseParallax = (
  elementRef: RefObject<HTMLElement>,
  intensity: number = 15
): ParallaxValues => {
  const [parallax, setParallax] = useState<ParallaxValues>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      
      const rotateY = (mouseX / rect.width) * intensity;
      const rotateX = -(mouseY / rect.height) * intensity;
      
      setParallax({
        rotateX,
        rotateY,
        scale: 1.02,
      });
    };

    const handleMouseLeave = () => {
      setParallax({
        rotateX: 0,
        rotateY: 0,
        scale: 1,
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [elementRef, intensity]);

  return parallax;
};
