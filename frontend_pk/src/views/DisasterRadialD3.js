// src/views/DisasterRadialD3.js
import React, { useEffect, useRef, useState, useContext } from 'react';
import * as d3 from 'd3';
import { getCauseSummary } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import { Typography, Box, CircularProgress } from '@mui/material';

// This component creates the interactive radial bar chart for fire causes using D3.js.
const DisasterRadialD3 = () => {
    // We use refs to get direct access to the SVG and tooltip DOM elements.
    const svgRef = useRef();
    const tooltipRef = useRef();
    // Setting up state to hold our data, totals, and loading status.
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [hoverData, setHoverData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // We need the global filters to fetch the right data and allow users to set a cause filter.
    const { filters, setFilters } = useContext(FilterContext);

    // This effect fetches the data whenever the filters change.
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const rawData = await getCauseSummary(filters);
                const sortedData = rawData
                    .map(d => ({ label: d.group, value: d.count }))
                    .sort((a, b) => b.value - a.value);

                // To keep the chart from getting too crowded, we'll show the top 12 causes
                // and group the rest into an "Other" category.
                const topN = 12;
                let finalData;

                if (sortedData.length > topN) {
                    const topData = sortedData.slice(0, topN);
                    const otherData = sortedData.slice(topN);
                    const otherSum = d3.sum(otherData, d => d.value);
                    finalData = [...topData, { label: "Other", value: otherSum }];
                } else {
                    finalData = sortedData;
                }

                setData(finalData);
                setTotal(d3.sum(sortedData, d => d.value));
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    // This is the main D3 drawing effect. It runs whenever the data changes.
    useEffect(() => {
        const svgEl = d3.select(svgRef.current);
        svgEl.selectAll('*').remove(); // Clear any previous chart rendering.
        if (data.length === 0 || isLoading) return; // Don't draw if there's no data.

        // Setting up our chart dimensions.
        const width = 720;
        const height = 720;
        const innerRadius = 100;
        const outerRadius = Math.min(width, height) / 2 - 80;

        // Create the main SVG group and center it.
        const svg = svgEl
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // The angle scale maps each cause label to a slice of the circle.
        const angleScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, 2 * Math.PI])
            .align(0);

        // The radius scale maps the fire count to the length of the bar.
        // We use a log scale to make smaller values more visible.
        const radiusScale = d3.scaleLog()
            .domain([1, d3.max(data, d => d.value) || 1])
            .range([innerRadius, outerRadius]);

        // A color scale to make the bars visually distinct.
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(data, d => d.value) || 1]);

        // The arc generator is a D3 helper that creates the path for each bar slice.
        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(d => radiusScale(d.value || 1))
            .startAngle(d => angleScale(d.label))
            .endAngle(d => angleScale(d.label) + angleScale.bandwidth())
            .padAngle(0.01)
            .padRadius(innerRadius);

        const tooltip = d3.select(tooltipRef.current);

        // Here we draw the main bars (the arcs).
        svg.append('g')
            .selectAll('path')
            .data(data)
            .join('path')
            .attr('d', arc)
            // We'll highlight the bar if it's the currently selected filter.
            .attr('fill', d =>
                d.label === filters.cause
                  ? '#f97316' // A bright orange for the selected cause.
                  : d.label === "Other"
                    ? "#cccccc" // Gray for the 'Other' category.
                    : colorScale(d.value)
            )
            .attr('stroke', 'white')
            .style('cursor', 'pointer')
            // Add event handlers for interactivity.
            .on('click', (event, d) => {
                // When a bar is clicked, update the global cause filter.
                setFilters(prev => ({ ...prev, cause: d.label }));
            })
            .on('mouseover', (event, d) => {
                // Show a tooltip on hover.
                setHoverData(d);
                tooltip
                    .style('opacity', 0.9)
                    .html(`<b>${d.label}</b><br/>${d.value.toLocaleString()} fires`)
                    .style('left', `${event.pageX + 15}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', () => {
                // Hide the tooltip when the mouse leaves.
                setHoverData(null);
                tooltip.style('opacity', 0);
            });

        // Now we add the text labels outside the bars.
        svg.append('g')
            .selectAll('text')
            .data(data)
            .join('text')
            .attr('text-anchor', d => {
                // Logic to make sure the text is always readable and doesn't flip upside down.
                const angle = angleScale(d.label) + angleScale.bandwidth() / 2;
                return (angle > Math.PI / 2 && angle < 3 * Math.PI / 2) ? 'end' : 'start';
            })
            .attr('transform', d => {
                const angle = angleScale(d.label) + angleScale.bandwidth() / 2;
                const r = radiusScale(d.value || 1) + 5;
                const rotation = (angle * 180 / Math.PI) - 90;
                const flip = (angle > Math.PI / 2 && angle < 3 * Math.PI / 2);
                return `rotate(${rotation}) translate(${r},0) rotate(${flip ? 180 : 0})`;
            })
            .text(d => d.label)
            .attr('alignment-baseline', 'middle')
            .style('font-size', '12px');

        // This creates the text in the center of the chart.
        // Clicking it will reset the cause filter.
        const centerText = svg.append('text')
            .attr('text-anchor', 'middle')
            .style('font-size', '24px')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .on('click', () => {
                setFilters(prev => ({ ...prev, cause: 'All' }));
            });

        // The top line of the center text (the number).
        centerText.append('tspan')
            .attr('class', 'center-value')
            .attr('x', 0)
            .attr('dy', '-0.1em')
            .text(hoverData ? hoverData.value.toLocaleString() : total.toLocaleString());

        // The bottom line of the center text (the label).
        centerText.append('tspan')
            .attr('class', 'center-label')
            .attr('x', 0)
            .attr('dy', '1.2em')
            .style('font-size', '14px')
            .style('font-weight', 'normal')
            .text(hoverData ? hoverData.label : "Total Fires");

    }, [data, hoverData, total, isLoading, filters, setFilters]);

    // Show a loading spinner while data is being fetched.
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Show a message if there's no data for the current filters.
    if (data.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography>No data for selected filters.</Typography>
            </Box>
        );
    }

    // This is the final JSX that renders the component.
    return (
        <>
            <Typography variant="h6" gutterBottom align="center">
                Fire Causes (radial log scale)
            </Typography>
            <div style={{ position: 'relative', flexGrow: 1, width: '100%', height: '100%' }}>
                {/* The SVG element that D3 will draw into. */}
                <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
                {/* The hidden div that will act as our tooltip. */}
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'absolute',
                        opacity: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '8px',
                        borderRadius: '4px',
                        pointerEvents: 'none',
                        fontSize: '12px',
                        transition: 'opacity 0.2s'
                    }}
                />
            </div>
        </>
    );
};

export default DisasterRadialD3;
