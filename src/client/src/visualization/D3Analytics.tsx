/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppSelector } from '../store/hooks';
import { selectPerformance } from '../store/slices/performanceSlice';
import { selectDashboard } from '../store/slices/dashboardSlice';
import { AnimatedBox } from '../animations/AnimationComponents';

interface D3AnalyticsProps {
  width?: number;
  height?: number;
  chartType?: 'line' | 'bar' | 'area' | 'scatter' | 'donut' | 'heatmap';
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
}

interface DataPoint {
  timestamp: Date;
  value: number;
  category: string;
  botId?: string;
}

export const D3Analytics: React.FC<D3AnalyticsProps> = ({
  width = 800,
  height = 400,
  chartType: initialChartType = 'line',
  timeRange: initialTimeRange = '24h',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { metrics, historicalData } = useAppSelector(selectPerformance);
  const { bots, analytics } = useAppSelector(selectDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState(initialChartType);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [selectedMetric, setSelectedMetric] = useState<'responseTime' | 'memoryUsage' | 'cpuUsage' | 'errorRate'>('responseTime');
  const [colorScheme, setColorScheme] = useState<'category10' | 'viridis' | 'warm' | 'cool'>('category10');

  // Generate sample data based on time range
  const generateSampleData = (): DataPoint[] => {
    const now = new Date();
    const dataPoints: DataPoint[] = [];
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;

    for (let i = 0; i < hours * 4; i++) { // 4 data points per hour
      const timestamp = new Date(now.getTime() - (i * 15 * 60 * 1000)); // 15-minute intervals

      dataPoints.push({
        timestamp,
        value: Math.random() * 100 + (selectedMetric === 'responseTime' ? 200 : 0),
        category: 'Performance',
        botId: bots[Math.floor(Math.random() * bots.length)]?.name,
      });

      // Add bot-specific data
      bots.forEach((bot, botIndex) => {
        dataPoints.push({
          timestamp,
          value: Math.random() * 50 + botIndex * 10,
          category: bot.name,
          botId: bot.name,
        });
      });
    }

    return dataPoints.reverse();
  };

  // Generate heatmap data
  const generateHeatmapData = () => {
    const data: { hour: number; day: number; value: number }[] = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          hour,
          day,
          value: Math.random() * 100,
        });
      }
    }

    return data;
  };

  // Create Line Chart
  const createLineChart = (data: DataPoint[], svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([innerHeight, 0]);

    // Line generator
    const line = d3.line<DataPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M') as any));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => ''),
      );

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => ''),
      );

    // Add line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#1976d2')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    g.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .attr('fill', '#1976d2')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('r', 6);
        showTooltip(event, d);
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 4);
        hideTooltip();
      });

    // Style grid lines
    g.selectAll('.grid line')
      .style('stroke', '#e0e0e0')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.7);
  };

  // Create Bar Chart
  const createBarChart = (data: DataPoint[], svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Group data by category
    const groupedData = d3.rollup(data,
      v => d3.mean(v, d => d.value) || 0,
      d => d.category,
    );

    const barData = Array.from(groupedData, ([category, value]) => ({ category, value }));

    // Scales
    const xScale = d3.scaleBand()
      .domain(barData.map(d => d.category))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.value) || 0])
      .range([innerHeight, 0]);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add bars
    g.selectAll('.bar')
      .data(barData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.category) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('fill', d => colorScale(d.category) as string)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
        showTooltip(event, { ...d, timestamp: new Date(), category: d.category });
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        hideTooltip();
      })
      .transition()
      .duration(1000)
      .attr('y', d => yScale(d.value))
      .attr('height', d => innerHeight - yScale(d.value));
  };

  // Create Heatmap
  const createHeatmap = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = generateHeatmapData();

    // Scales
    const xScale = d3.scaleBand()
      .domain(d3.range(24) as any)
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(d3.range(7) as any)
      .range([0, innerHeight])
      .padding(0.05);

    let interpolator = d3.interpolateInferno;
    switch (colorScheme) {
      case 'viridis': interpolator = d3.interpolateViridis; break;
      case 'warm': interpolator = d3.interpolateWarm; break;
      case 'cool': interpolator = d3.interpolateCool; break;
      case 'category10':
      default:
        interpolator = d3.interpolateInferno; break;
    }

    const colorScale = d3.scaleSequential(interpolator)
      .domain([0, 100]);

    // Add cells
    g.selectAll('.cell')
      .data(data)
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.hour) || 0)
      .attr('y', d => yScale(d.day) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
        showTooltip(event, {
          timestamp: new Date(),
          value: d.value,
          category: `Day ${d.day}, Hour ${d.hour}`,
        } as DataPoint);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', 'none');
        hideTooltip();
      });

    // Add axes
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${d}:00`));

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => days[d as number]));
  };

  // Tooltip functions
  const showTooltip = (event: MouseEvent, data: DataPoint) => {
    if (!tooltipRef.current) { return; }

    const tooltip = d3.select(tooltipRef.current);
    tooltip.style('opacity', 1)
      .html(`
        <div style="padding: 8px;">
          <strong>${data.category}</strong><br/>
          Value: ${data.value.toFixed(2)}<br/>
          Time: ${data.timestamp.toLocaleString()}
        </div>
      `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 28}px`);
  };

  const hideTooltip = () => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  };

  // Chart rendering
  useEffect(() => {
    if (!svgRef.current) { return; }

    const svg = d3.select(svgRef.current);
    svg.attr('width', width).attr('height', height);

    let data: DataPoint[] | null = null;

    switch (chartType) {
      case 'line':
        data = generateSampleData();
        if (data) { createLineChart(data, svg); }
        break;
      case 'bar':
        data = generateSampleData();
        if (data) { createBarChart(data, svg); }
        break;
      case 'heatmap':
        createHeatmap(svg);
        break;
      default:
        data = generateSampleData();
        if (data) { createLineChart(data, svg); }
    }

    setIsLoading(false);
  }, [chartType, selectedMetric, timeRange, colorScheme, width, height]);

  if (isLoading) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="loading loading-spinner loading-lg"></span>
          <p>Loading Analytics Charts...</p>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
      sx={{ width, position: 'relative' }}
    >
      {/* Controls Panel */}
      <div className="absolute top-4 right-4 z-50 bg-base-100 rounded-box p-4 shadow-xl max-w-xs border border-base-200">
        <h3 className="font-bold mb-2">
          Chart Controls
        </h3>

        {/* Chart Type */}
        <div className="mb-4">
          <p className="text-xs mb-1">Chart Type:</p>
          <select
            className="select select-bordered select-sm w-full"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="heatmap">Heatmap</option>
          </select>
        </div>

        {/* Metric Selection */}
        <div className="mb-4">
          <p className="text-xs mb-1">Metric:</p>
          <select
            className="select select-bordered select-sm w-full"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
          >
            <option value="responseTime">Response Time</option>
            <option value="memoryUsage">Memory Usage</option>
            <option value="cpuUsage">CPU Usage</option>
            <option value="errorRate">Error Rate</option>
          </select>
        </div>

        {/* Color Scheme */}
        <div className="mb-4">
          <p className="text-xs mb-1">Color Scheme:</p>
          <select
            className="select select-bordered select-sm w-full"
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value as any)}
          >
            <option value="category10">Category 10</option>
            <option value="viridis">Viridis</option>
            <option value="warm">Warm</option>
            <option value="cool">Cool</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mt-2 pt-2 border-t border-base-200 text-xs space-y-1">
          <p>Data Points: {chartType === 'heatmap' ? '168' : '96'}</p>
          <p>Time Range: {timeRange}</p>
          <p>Active Metrics: 4</p>
        </div>
      </div>

      {/* Chart Container */}
      <div className="card bg-base-100 shadow-xl overflow-hidden">
        <div className="card-body p-0">
          <svg
            ref={svgRef}
            style={{ display: 'block', background: 'white' }}
          />
        </div>
      </div>

      {/* Custom Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: '12px',
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 1000,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      />
    </AnimatedBox>
  );
};

export default D3Analytics;