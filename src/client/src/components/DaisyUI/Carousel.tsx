import React, { useState, useEffect } from 'react';

type CarouselItem = {
  image: string;
  title: string;
  description: string;
  bgGradient?: string;
  link?: string;
};

type CarouselProps = {
  items: CarouselItem[];
  autoplay?: boolean;
  interval?: number;
  variant?: 'full-width' | 'card-style';
  onSlideClick?: (item: CarouselItem, index: number) => void;
  /** How many slides to show at once (default 1). On desktop, 2 shows half-width slides. */
  visibleCount?: number;
};

export const Carousel: React.FC<CarouselProps> = ({
  items,
  autoplay = true,
  interval = 5000,
  variant = 'full-width',
  onSlideClick,
  visibleCount = 1,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = Math.max(1, Math.min(visibleCount, items.length));

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, autoplay, interval]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  // Build array of visible items (wrapping around)
  const visibleItems = Array.from({ length: count }, (_, i) =>
    items[(activeIndex + i) % items.length]
  );
  const visibleIndices = Array.from({ length: count }, (_, i) =>
    (activeIndex + i) % items.length
  );

  const renderSlide = (item: CarouselItem, idx: number) => (
    <div
      key={`${activeIndex}-${idx}`}
      className={`relative overflow-hidden rounded-lg ${onSlideClick || item.link ? 'cursor-pointer' : ''}`}
      style={{ flex: `0 0 calc(${100 / count}% - ${count > 1 ? '0.5rem' : '0px'})` }}
      onClick={() => onSlideClick?.(item, visibleIndices[idx])}
    >
      <div
        className="w-full h-40 flex items-center justify-center"
        style={{ background: item.image ? undefined : (item.bgGradient || 'linear-gradient(135deg, #667eea, #764ba2)') }}
      >
        {item.image ? (
          <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
        ) : (
          <span className={`font-bold text-white/20 ${count > 1 ? 'text-xl' : 'text-3xl'}`}>{item.title}</span>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-white">
        <h3 className={`font-bold ${count > 1 ? 'text-xs' : 'text-sm'}`}>{item.title}</h3>
        <p className={`opacity-80 ${count > 1 ? 'text-[10px] line-clamp-2' : 'text-xs'}`}>{item.description}</p>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Slides */}
      <div className={`flex gap-2 ${variant === 'card-style' ? 'rounded-box bg-neutral p-4' : ''}`}>
        {visibleItems.map((item, idx) => renderSlide(item, idx))}
      </div>

      {/* Navigation arrows */}
      <button
        className="btn btn-circle btn-sm absolute left-1 top-1/2 -translate-y-1/2 z-10 opacity-70 hover:opacity-100"
        onClick={handlePrev}
        aria-label="Previous slide"
      >
        ❮
      </button>
      <button
        className="btn btn-circle btn-sm absolute right-1 top-1/2 -translate-y-1/2 z-10 opacity-70 hover:opacity-100"
        onClick={handleNext}
        aria-label="Next slide"
      >
        ❯
      </button>

      {/* Dot indicators */}
      <div className="flex w-full justify-center gap-1 py-1">
        {items.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              visibleIndices.includes(index) ? 'bg-primary scale-125' : 'bg-base-300'
            }`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
