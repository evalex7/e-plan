import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import PageTransition from './PageTransition';

interface AnimatedPageWrapperProps {
  children: React.ReactNode;
  animationType?: 'fade' | 'slide' | 'scale' | 'slideUp';
  duration?: number;
}

export default function AnimatedPageWrapper({ 
  children, 
  animationType = 'fade',
  duration = 300 
}: AnimatedPageWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      // Анімація появи при фокусі на сторінці
      setIsVisible(true);
      
      return () => {
        // Анімація зникнення при втраті фокусу
        setIsVisible(false);
      };
    }, [])
  );

  useEffect(() => {
    // Початкова анімація появи
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <PageTransition 
      isVisible={isVisible} 
      animationType={animationType}
      duration={duration}
    >
      {children}
    </PageTransition>
  );
}