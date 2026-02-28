import React, { useState, useEffect } from 'react';

type CarouselItem = {
  image: string;
  title: string;
  description: string;
  bgGradient?: string; // CSS gradient to use when image is empty
};

type CarouselProps = {
  items: CarouselItem[];
  autoplay?: boolean;
  interval?: number;
  variant?: 'full-width' | 'card-style';
};

const Carousel: React.FC<CarouselProps> = ({
  items,
  autoplay = true,
  interval = 5000,
  variant = 'full-width',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!autoplay) { return; }

    const tick = () => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % items.length);
    };

    const timer = setInterval(tick, interval);

    return () => clearInterval(timer);
  }, [items.length, autoplay, interval]);

  const handleSelect = (selectedIndex: number) => {
    setActiveIndex(selectedIndex);
  };

  const handlePrev = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const carouselClasses = `carousel w-full ${variant === 'card-style' ? 'space-x-4 rounded-box bg-neutral p-4' : ''
    }`;

  return (
    <div className="relative">
      <div className={carouselClasses}>
        {items.map((item, index) => (
          <div
            key={index}
            id={`slide${index}`}
            className={`carousel-item relative w-full ${variant === 'card-style' ? 'carousel-item-card' : ''
              }`}
            style={{ display: index === activeIndex ? 'block' : 'none' }}
          >
            {item.image ? (
              <img src={item.image} className="w-full" alt={item.title} />
            ) : (
              <div
                className={`w-full h-64 flex items-center justify-center ${!item.bgGradient && 'bg-gradient-to-br from-primary to-secondary'}`}
                style={item.bgGradient ? { background: item.bgGradient } : undefined}
              >
                <span className="text-4xl font-bold text-primary-content/50">{item.title}</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 text-white">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
              <a href={`#slide${(index - 1 + items.length) % items.length}`} className="btn btn-circle" onClick={handlePrev}>
                ❮
              </a>
              <a href={`#slide${(index + 1) % items.length}`} className="btn btn-circle" onClick={handleNext}>
                ❯
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="flex w-full justify-center gap-2 py-2">
        {items.map((_, index) => (
          <a
            key={index}
            href={`#slide${index}`}
            className={`btn btn-xs ${index === activeIndex ? 'btn-active' : ''}`}
            onClick={() => handleSelect(index)}
          >
            {index + 1}
          </a>
        ))}
      </div>
    </div>
  );
};

export default Carousel;