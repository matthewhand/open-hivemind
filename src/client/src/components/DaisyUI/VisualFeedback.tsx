import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Metric {
  name: string;
  value: number;
  unit: string;
}

interface VisualFeedbackProps {
  metrics?: Metric[];
  initialRating?: number;
  type?: 'error' | 'success' | 'warning' | 'info';
  message?: string;
  visible?: boolean;
}

const getProgressColor = (value: number) => {
  if (value > 90) { return 'text-error'; }
  if (value > 70) { return 'text-warning'; }
  return 'text-success';
};

const VisualFeedback: React.FC<VisualFeedbackProps> = ({
  metrics,
  initialRating = 0,
  type,
  message,
  visible = true,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (!metrics) return;
    const interval = setInterval(() => {
      console.log('Fetching new metrics data...');
    }, 5000);
    return () => clearInterval(interval);
  }, [metrics]);

  const alertClass = {
    error: 'alert-error',
    success: 'alert-success',
    warning: 'alert-warning',
    info: 'alert-info',
  }[type || 'info'];

  const icon = {
    error: '❌',
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  }[type || 'info'];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
          className="w-full mb-6"
        >
          {type && message ? (
            <div className={`alert ${alertClass} shadow-lg rounded-box`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <span className="font-semibold text-base">{message}</span>
              </div>
            </div>
          ) : metrics ? (
            <div className="p-4 bg-base-200 rounded-box shadow-lg">
              <h2 className="text-2xl font-bold mb-4">System Health & Feedback</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {metrics.map((metric, i) => (
                  <motion.div
                    key={metric.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, type: 'spring' }}
                    className="flex flex-col items-center p-4 bg-base-100 rounded-box"
                  >
                    <div
                      className={`radial-progress ${getProgressColor(metric.value)}`}
                      style={{ '--value': metric.value, '--size': '8rem', '--thickness': '0.5rem' } as React.CSSProperties}
                      role="progressbar"
                    >
                      <span className="text-xl font-bold">{`${metric.value}${metric.unit}`}</span>
                    </div>
                    <p className="mt-2 text-lg font-semibold">{metric.name}</p>
                  </motion.div>
                ))}
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Rate Bot Performance</h3>
                <div className="rating rating-lg">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.input
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      key={star}
                      type="radio"
                      name="rating-2"
                      className={`mask mask-star-2 ${
                        (hoverRating || rating) >= star ? 'bg-orange-400' : 'bg-base-300'
                      } cursor-pointer`}
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
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VisualFeedback;