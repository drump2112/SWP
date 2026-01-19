import React, { useState, useEffect } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';

const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      // Find the main scrollable container
      const mainContent = document.querySelector('main');
      if (mainContent) {
        if (mainContent.scrollTop > 300) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      }
    };

    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.addEventListener('scroll', toggleVisibility);
      return () => mainContent.removeEventListener('scroll', toggleVisibility);
    }
  }, []);

  const scrollToTop = () => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-50
        p-3 rounded-full
        bg-gradient-to-r from-blue-600 to-indigo-600
        text-white shadow-lg
        hover:from-blue-700 hover:to-indigo-700
        hover:shadow-xl hover:scale-110
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
      `}
      aria-label="Về đầu trang"
      title="Về đầu trang"
    >
      <ChevronUpIcon className="h-6 w-6" />
    </button>
  );
};

export default ScrollToTop;
