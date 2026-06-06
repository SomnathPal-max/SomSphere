import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { subDays, format, parseISO } from 'date-fns';
import { X, CheckCircle2, ChevronDown, Download, BarChart3 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import type { Assignment } from '../types';

interface ProductivityChartProps {
  assignments: Assignment[];
}

type ViewRange = 'Weekly' | 'Monthly' | 'All-time';

export function ProductivityChart({ assignments }: ProductivityChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewRange, setViewRange] = useState<ViewRange>('Weekly');

  const [compareMode, setCompareMode] = useState<boolean>(false);
  const downloadSnapshot = async () => {
    if (!chartContainerRef.current) return;
    // Hide tooltips before snapshot just in case
    d3.selectAll('.d3-tooltip').style('opacity', 0);
    try {
      const dataUrl = await htmlToImage.toPng(chartContainerRef.current, {
        backgroundColor: '#12121A',
        style: { transform: 'none' }
      });
      const link = document.createElement('a');
      link.download = `productivity-chart-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to download snapshot', e);
    }
  };

  const data = useMemo(() => {
    const now = new Date();

    if (viewRange === 'Weekly') {
      const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i));
      const prev7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 13 - i));
      return last7Days.map((d, i) => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const prevDateStr = format(prev7Days[i], 'yyyy-MM-dd');
        const completedTasks = assignments.filter(
          a => a.status === 'DONE' && a.dueDate === dateStr
        );
        const prevCompletedTasks = assignments.filter(
          a => a.status === 'DONE' && a.dueDate === prevDateStr
        );
        return {
          date: dateStr,
          label: format(d, 'EEE'),
          info: format(d, 'MMM do'),
          fullDateInfo: format(d, 'EEEE, MMMM do, yyyy'),
          completed: completedTasks.length,
          prevCompleted: prevCompletedTasks.length,
          high: completedTasks.filter(a => a.priority === 'HIGH').length,
          medium: completedTasks.filter(a => a.priority === 'MEDIUM').length,
          low: completedTasks.filter(a => a.priority === 'LOW').length,
          unset: completedTasks.filter(a => !a.priority).length,
        };
      });
    } else if (viewRange === 'Monthly') {
      const last30Days = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
      const prev30Days = Array.from({ length: 30 }, (_, i) => subDays(now, 59 - i));
      return last30Days.map((d, i) => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const prevDateStr = format(prev30Days[i], 'yyyy-MM-dd');
        const completedTasks = assignments.filter(
          a => a.status === 'DONE' && a.dueDate === dateStr
        );
        const prevCompletedTasks = assignments.filter(
          a => a.status === 'DONE' && a.dueDate === prevDateStr
        );
        return {
          date: dateStr,
          label: format(d, 'dd'),
          info: format(d, 'MMM do'),
          fullDateInfo: format(d, 'EEEE, MMMM do, yyyy'),
          completed: completedTasks.length,
          prevCompleted: prevCompletedTasks.length,
          high: completedTasks.filter(a => a.priority === 'HIGH').length,
          medium: completedTasks.filter(a => a.priority === 'MEDIUM').length,
          low: completedTasks.filter(a => a.priority === 'LOW').length,
          unset: completedTasks.filter(a => !a.priority).length,
        };
      });
    } else {
      const last12Months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
      const prev12Months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear() - 1, now.getMonth() - 11 + i, 1));
      return last12Months.map((d, i) => {
        const monthStr = format(d, 'yyyy-MM');
        const prevMonthStr = format(prev12Months[i], 'yyyy-MM');
        const completedTasks = assignments.filter(
          a => a.status === 'DONE' && a.dueDate?.startsWith(monthStr)
        );
        const prevCompletedTasks = assignments.filter(
          a => a.status === 'DONE' && a.dueDate?.startsWith(prevMonthStr)
        );
        return {
          date: monthStr,
          label: format(d, 'MMM'),
          info: format(d, 'MMM yyyy'),
          fullDateInfo: format(d, 'MMMM yyyy'),
          completed: completedTasks.length,
          prevCompleted: prevCompletedTasks.length,
          high: completedTasks.filter(a => a.priority === 'HIGH').length,
          medium: completedTasks.filter(a => a.priority === 'MEDIUM').length,
          low: completedTasks.filter(a => a.priority === 'LOW').length,
          unset: completedTasks.filter(a => !a.priority).length,
        };
      });
    }
  }, [assignments, viewRange]);

  const isEmpty = useMemo(() => {
    return data.every(d => d.completed === 0 && (!compareMode || d.prevCompleted === 0));
  }, [data, compareMode]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    if (viewRange === 'All-time') {
      return assignments.filter(a => a.status === 'DONE' && a.dueDate?.startsWith(selectedDate));
    }
    return assignments.filter(a => a.status === 'DONE' && a.dueDate === selectedDate);
  }, [assignments, selectedDate, viewRange]);

  const selectedDataPoint = useMemo(() => data.find(d => d.date === selectedDate), [data, selectedDate]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Reset zoom state on re-render to prevent jumpiness
    if (svg.node()) {
      (svg.node() as any).__zoom = d3.zoomIdentity;
    }

    const width = svgRef.current.parentElement?.clientWidth || 300;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 30 };

    svg.attr("width", "100%")
       .attr("height", height)
       .attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.date))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const yMax = d3.max(data, d => Math.max(d.completed, compareMode ? d.prevCompleted : 0)) || 5;
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const tooltip = d3.select(svgRef.current.parentElement)
      .selectAll(".d3-tooltip")
      .data([1])
      .join("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .style("background", "rgba(18, 18, 26, 0.95)")
      .style("border", "1px solid rgba(255, 255, 255, 0.1)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("transform", "translate(-50%, -100%)")
      .style("margin-top", "-12px")
      .style("z-index", "100")
      .style("box-shadow", "0 10px 15px -3px rgba(0, 0, 0, 0.5)");

    const gridLines = svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-width + margin.left + margin.right).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.05)"));

    const clipId = `clip-${Math.random().toString(36).substring(2)}`;
    svg.append("defs").append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", margin.left)
      .attr("y", 0)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height);

    const chartContent = svg.append("g").attr("clip-path", `url(#${clipId})`);

    const stack = d3.stack<any>()
      .keys(["unset", "low", "medium", "high"]);
    const series = stack(data as any);

    const defaultColor = d3.scaleOrdinal()
      .domain(["unset", "low", "medium", "high"])
      .range(["#8b5cf6", "#8b5cf6", "#f59e0b", "#ef4444"]);

    const seriesGroups = chartContent.append("g")
      .selectAll("g")
      .data(series)
      .join("g")
      .attr("fill", d => defaultColor(d.key) as string);

    const rects = seriesGroups.selectAll("rect")
      .data(d => d)
      .join("rect")
      .attr("x", d => x(d.data.date) as number)
      .attr("y", height - margin.bottom)
      .attr("height", 0)
      .attr("width", x.bandwidth())
      .attr("rx", 2)
      .attr("ry", 2);

    rects.transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .delay((d, i) => i * (viewRange === 'Weekly' ? 50 : 15))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]));

    if (compareMode) {
      const line = d3.line<any>()
        .x(d => (x(d.date) as number) + x.bandwidth() / 2)
        .y(height - margin.bottom) // Start from bottom for animation
        .curve(d3.curveMonotoneX);

      const path = chartContent.append("path")
        .attr("class", "compare-line")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4")
        .attr("opacity", 0.5)
        .attr("d", line);

      const targetLine = d3.line<any>()
        .x(d => (x(d.date) as number) + x.bandwidth() / 2)
        .y(d => y(d.prevCompleted))
        .curve(d3.curveMonotoneX);

      path.transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr("d", targetLine);
    }

    const overlays = chartContent.append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.date) as number)
      .attr("y", margin.top)
      .attr("width", x.bandwidth())
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedDate(d.date);
      })
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "rgba(255,255,255,0.1)");
        
        let details = [];
        if (d.high) details.push(`<span style="color:#ef4444">${d.high} High</span>`);
        if (d.medium) details.push(`<span style="color:#f59e0b">${d.medium} Med</span>`);
        if (d.low || d.unset) details.push(`<span style="color:#8b5cf6">${d.low + d.unset} Low</span>`);
        
        const countText = d.completed === 1 ? "1 task total" : `${d.completed} tasks total`;
        let prevText = '';
        if (compareMode) {
          prevText = `<div style="margin-bottom: 4px; color: rgba(255,255,255,0.7); font-size: 10px;">Previous: ${d.prevCompleted}</div>`;
        }
        tooltip.html(`
          <div style="color: #f472b6; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">
            ${d.info}
          </div>
          <div style="margin-bottom: ${compareMode ? '2px' : '4px'};">${countText}</div>
          ${prevText}
          ${details.length > 0 ? `<div style="font-size: 10px; font-weight: normal; color: #9CA3AF">${details.join(" &bull; ")}</div>` : ''}
        `);

        const [xPos, yPos] = d3.pointer(event, svgRef.current);
        tooltip.style("left", `${xPos}px`).style("top", `${yPos}px`);
        
        tooltip.interrupt().transition().delay(500).duration(200).style("opacity", 1);
      })
      .on("mousemove", function(event) {
        const [xPos, yPos] = d3.pointer(event, svgRef.current);
        tooltip.style("left", `${xPos}px`).style("top", `${yPos}px`);
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", "transparent");
        tooltip.interrupt().transition().duration(200).style("opacity", 0);
      });

    // X Axis
    const xAxis = d3.axisBottom(x).tickSize(0).tickPadding(8);
    
    if (viewRange === 'Monthly') {
      xAxis.tickValues(x.domain().filter((_, i) => i % 5 === 0 || i === x.domain().length - 1));
    }
    
    xAxis.tickFormat(val => data.find(item => item.date === val)?.label || String(val));

    const xAxisGroup = chartContent.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll("text").attr("fill", "#9CA3AF").attr("font-size", "10px").attr("font-weight", "600"));

    // Y Axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8).tickFormat(d3.format("d")))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll("text").attr("fill", "#6B7280").attr("font-size", "10px"));

    const xLinear = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.left, width - margin.right]);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, Math.max(1, data.length / 7)])
      .translateExtent([[margin.left, 0], [width - margin.right, height]])
      .extent([[margin.left, 0], [width - margin.right, height]])
      .on("zoom", (event) => {
        const xr = event.transform.rescaleX(xLinear);
        x.range([xr(0), xr(1)]);

        seriesGroups.selectAll("rect")
          .attr("x", (d: any) => x(d.data.date) as number)
          .attr("width", x.bandwidth());

        overlays
          .attr("x", (d: any) => x(d.date) as number)
          .attr("width", x.bandwidth());

        if (compareMode) {
          const targetLine = d3.line<any>()
            .x(d => (x(d.date) as number) + x.bandwidth() / 2)
            .y(d => y(d.prevCompleted))
            .curve(d3.curveMonotoneX);
          svg.select(".compare-line").attr("d", targetLine as any); 
        }

        xAxisGroup
          .call(xAxis as any)
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll("text").attr("fill", "#9CA3AF").attr("font-size", "10px").attr("font-weight", "600"));
      });

    svg.call(zoom);

  }, [data, viewRange, compareMode]);

  return (
    <>
      <div ref={chartContainerRef} className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md relative overflow-hidden group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
              {viewRange} Task Trends
            </h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest hidden sm:block">Compare Last {viewRange === 'All-time' ? 'Year' : viewRange === 'Monthly' ? 'Month' : 'Week'}</span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={compareMode} 
                    onChange={(e) => setCompareMode(e.target.checked)} 
                  />
                  <div className={`w-8 h-4 rounded-full transition-colors ${compareMode ? 'bg-pink-500' : 'bg-white/10'}`}></div>
                  <div className={`absolute w-3 h-3 bg-white rounded-full top-[2px] transition-transform ${compareMode ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
                </div>
              </label>
              <div className="relative">
                <select 
                  value={viewRange}
                  onChange={(e) => setViewRange(e.target.value as ViewRange)}
                  className="appearance-none bg-white/5 border border-white/10 text-white text-xs font-bold py-1.5 pl-3 pr-7 rounded-lg outline-none focus:border-pink-500/50 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <option value="Weekly" className="bg-[#12121A] text-white">Weekly</option>
                  <option value="Monthly" className="bg-[#12121A] text-white">Monthly</option>
                  <option value="All-time" className="bg-[#12121A] text-white">All-time</option>
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
              <button 
                onClick={downloadSnapshot}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Download Snapshot"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="w-full relative">
            <svg ref={svgRef} className={`w-full h-auto overflow-visible ${isEmpty ? 'opacity-20' : ''}`}></svg>
            {isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <BarChart3 className="w-8 h-8 text-white/20 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No activity in this period</p>
                <p className="text-gray-500 text-xs mt-1">Complete tasks to see them here</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span>Med</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6] shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>
            <span>Low</span>
          </div>
          {compareMode && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-4">
              <div className="w-4 border-t-2 border-dashed border-white opacity-50"></div>
              <span>Previous</span>
            </div>
          )}
        </div>
      </div>
      
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#12121A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">Completed Tasks</h3>
                <p className="text-sm text-gray-400">{selectedDataPoint?.fullDateInfo}</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {selectedTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tasks completed on this timeframe.</p>
                </div>
              ) : (
                selectedTasks.map(task => (
                  <div key={task.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-white">{task.title}</h4>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-white/70">{task.subject}</span>
                        <span className="text-gray-500">{task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
