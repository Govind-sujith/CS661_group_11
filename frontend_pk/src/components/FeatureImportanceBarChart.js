// src/components/FeatureImportanceBarChart.js
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// This component uses the D3 library to create a bar chart that shows
// how important each feature was to our machine learning model's predictions.
const FeatureImportanceBarChart = () => {
  // We use a ref to give D3 a direct handle to the SVG element in the DOM.
  const svgRef = useRef();

  // This data is hardcoded for now. It comes from the output of our ML model training
  // and shows the "importance" score for each feature.
  const data = [
    { feature: 'lat_lon_interaction', importance: 237146 },
    { feature: 'LATITUDE', importance: 191794 },
    { feature: 'LONGITUDE', importance: 182640 },
    { feature: 'FIRE_YEAR', importance: 149912 },
    { feature: 'FIRE_SIZE', importance: 149381 },
    { feature: 'doy_cos', importance: 122070 },
    { feature: 'doy_sin', importance: 118588 },
    { feature: 'STATE', importance: 90306 },
    { feature: 'OWNER_CODE', importance: 54209 },
    { feature: 'NWCG_REPORTING_AGENCY', importance: 23954 }
  ];

  // The useEffect hook is where all the D3 magic happens.
  // It runs after the component has rendered.
  useEffect(() => {
    // First, we select the SVG element using the ref.
    const svg = d3.select(svgRef.current);
    // Let's clear out any old chart from previous renders to prevent duplicates.
    svg.selectAll('*').remove();

    // Setting up our chart dimensions and some margins for spacing.
    const width = 800;
    const height = 500;
    const margin = { top: 50, right: 100, bottom: 40, left: 200 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // We'll add a 'g' element (a group) to hold the chart, which makes positioning easier.
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // The y-scale maps our feature names to positions on the vertical axis.
    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.feature))
      .range([0, chartHeight])
      .padding(0.2);

    // The x-scale maps the importance values to the horizontal length of the bars.
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.importance)])
      .nice()
      .range([0, chartWidth]);

    // Drawing the X-axis at the bottom of the chart.
    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(',d')))
      .selectAll('text')
      .style('font-size', '12px');

    // Drawing the Y-axis on the left side.
    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', '13px');

    // Here's the core logic for creating the bars themselves.
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', (d) => y(d.feature))
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', (d) => x(d.importance))
      .attr('fill', '#42A5F5');

    // And now, we add the numeric labels at the end of each bar for clarity.
    g.selectAll('.value')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value')
      .attr('x', (d) => x(d.importance) + 6)
      .attr('y', (d) => y(d.feature) + y.bandwidth() / 2 + 4)
      .text((d) => d.importance.toLocaleString())
      .style('font-size', '12px')
      .style('fill', 'black');
  }, [data]); // This effect depends on the 'data' array.

  // Finally, we render the SVG element that D3 will draw into.
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default FeatureImportanceBarChart;
