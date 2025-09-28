import React, { useState, useEffect } from 'react';

interface Metric {
  name: string;
  value: number;
  unit: string;
}

interface VisualFeedbackProps {
  metrics: Metric[];
  initialRating?: number;
}

const getProgressColor = (value: number) => {
  if (value > 90) return 'text-error';
  if (value > 70) return 'text-warning';
  return 'text-success';
};

const VisualFeedback: React.FC<VisualFeedbackProps> = ({ metrics, initialRating = 0 }) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    // Here you would typically fetch real-time data
    // For demonstration, we'll just log updates
    const interval = setInterval(() => {
      console.log('Fetching new metrics data...');
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-base-200 rounded-box shadow-lg">
      <h2 className="text-2xl font-bold mb-4">System Health & Feedback</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((metric) => (
          <div key={metric.name} className="flex flex-col items-center p-4 bg-base-100 rounded-box">
            <div
              className={`radial-progress ${getProgressColor(metric.value)}`}
              style={{ '--value': metric.value, '--size': '8rem', '--thickness': '0.5rem' } as React.CSSProperties}
              role="progressbar"
            >
              <span className="text-xl font-bold">{`${metric.value}${metric.unit}`}</span>
            </div>
            <p className="mt-2 text-lg font-semibold">{metric.name}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Rate Bot Performance</h3>
        <div className="rating rating-lg">
          {[1, 2, 3, 4, 5].map((star) => (
            <input
              key={star}
              type="radio"
              name="rating-2"
              className={`mask mask-star-2 ${
                (hoverRating || rating) >= star ? 'bg-orange-400' : 'bg-base-300'
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              checked={rating === star}
              onChange={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VisualFeedback;