import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Card, CardContent, Typography, FormControl, MenuItem, Select, Chip } from '@mui/material';
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

interface MetricData {
  timestamp: Date;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  activeBots: number;
}

export const D3Analytics: React.FC<D3AnalyticsProps> = ({
  width = 800,
  height = 400,
  chartType = 'line',
  timeRange = '24h',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { metrics, historicalData } = useAppSelector(selectPerformance);
  const { bots, analytics } = useAppSelector(selectDashboard);
  const [isLoading, setIsLoading] = useState(true);
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
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
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

  // Color schemes
  const getColorScale = (scheme: string) => {
    switch (scheme) {
      case 'viridis':
        return d3.interpolateViridis;
      case 'warm':
        return d3.interpolateWarm;
      case 'cool':
        return d3.interpolateCool;
      default:
        return d3.schemeCategory10;
    }
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
        .tickFormat(() => '')
      );

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
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
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6);
        showTooltip(event, d);
      })
      .on('mouseout', function() {
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
      d => d.category
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
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 0.8);
        showTooltip(event, { ...d, timestamp: new Date(), category: d.category });
      })
      .on('mouseout', function() {
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
      .domain(d3.range(24))
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(d3.range(7))
      .range([0, innerHeight])
      .padding(0.05);

    const colorScale = d3.scaleSequential(d3.interpolateInferno)
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
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
        showTooltip(event, {
          timestamp: new Date(),
          value: d.value,
          category: `Day ${d.day}, Hour ${d.hour}`,
        } as DataPoint);
      })
      .on('mouseout', function() {
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
    if (!tooltipRef.current) return;

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
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.attr('width', width).attr('height', height);

    let data: DataPoint[] | null = null;

    switch (chartType) {
      case 'line':
        data = generateSampleData();
        if (data) createLineChart(data, svg);
        break;
      case 'bar':
        data = generateSampleData();
        if (data) createBarChart(data, svg);
        break;
      case 'heatmap':
        createHeatmap(svg);
        break;
      default:
        data = generateSampleData();
        if (data) createLineChart(data, svg);
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
        <Typography>Loading Analytics Charts...</Typography>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
      sx={{ width, position: 'relative' }}
    >
      {/* Controls Panel */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          p: 2,
          boxShadow: 3,
          maxWidth: 300,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Chart Controls
        </Typography>
        
        {/* Chart Type */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Chart Type:</Typography>
          <Select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            size="small"
            fullWidth
          >
            <MenuItem value="line">Line Chart</MenuItem>
            <MenuItem value="bar">Bar Chart</MenuItem>
            <MenuItem value="heatmap">Heatmap</MenuItem>
          </Select>
        </Box>

        {/* Metric Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Metric:</Typography>
          <Select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            size="small"
            fullWidth
          >
            <MenuItem value="responseTime">Response Time</MenuItem>
            <MenuItem value="memoryUsage">Memory Usage</MenuItem>
            <MenuItem value="cpuUsage">CPU Usage</MenuItem>
            <MenuItem value="errorRate">Error Rate</MenuItem>
          </Select>
        </Box>

        {/* Color Scheme */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>Color Scheme:</Typography>
          <Select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value as any)}
            size="small"
            fullWidth
          >
            <MenuItem value="category10">Category 10</MenuItem>
            <MenuItem value="viridis">Viridis</MenuItem>
            <MenuItem value="warm">Warm</MenuItem>
            <MenuItem value="cool">Cool</MenuItem>
          </Select>
        </Box>

        {/* Stats */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2">
            Data Points: {chartType === 'heatmap' ? '168' : '96'}
          </Typography>
          <Typography variant="body2">
            Time Range: {timeRange}
          </Typography>
          <Typography variant="body2">
            Active Metrics: 4
          </Typography>
        </Box>
      </Box>

      {/* Chart Container */}
      <Card sx={{ width, borderRadius: 2, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <svg
            ref={svgRef}
            style={{ display: 'block', background: 'white' }}
          />
        </CardContent>
      </Card>

      {/* Custom Tooltip */}
      <Box
        ref={tooltipRef}
        sx={{
          position: 'absolute',
          pointerEvents: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 1,
          fontSize: '12px',
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 1000,
          boxShadow: 3,
        }}
      />
    </AnimatedBox>
  );
};

export default D3Analytics;