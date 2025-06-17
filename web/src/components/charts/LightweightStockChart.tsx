import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
  HistogramData,
  LineData,
  LineSeries,
  CandlestickSeries,
  HistogramSeries,
  PriceLineOptions,
} from 'lightweight-charts';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma_20?: number;
  sma_50?: number;
  sma_100?: number;
  sma_150?: number;
  sma_200?: number;
  rsi_14?: number;
}

interface LightweightStockChartProps {
  data: ChartDataPoint[];
  visibleIndicators: { [key: string]: boolean };
  timeframe: string;
}

const toCandle = (d: ChartDataPoint): CandlestickData => ({
  time: d.time, open: d.open, high: d.high, low: d.low, close: d.close,
});

const toVolume = (d: ChartDataPoint): HistogramData => ({
  time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 68, 68, 0.5)',
});

const toLine = (d: ChartDataPoint, key: keyof ChartDataPoint): LineData | null => {
  const value = d[key];
  return typeof value === 'number' ? { time: d.time, value } : null;
};

const indicatorConfig = {
  sma20: { color: '#2962FF', key: 'sma_20' , title: 'SMA 20'},
  sma50: { color: '#FF6D00', key: 'sma_50' , title: 'SMA 50'},
  sma100: { color: '#F50057', key: 'sma_100' , title: 'SMA 100'},
  sma150: { color: '#FFEA00', key: 'sma_150' , title: 'SMA 150'},
  sma200: { color: '#76FF03', key: 'sma_200' , title: 'SMA 200'},
};

const LightweightStockChart: React.FC<LightweightStockChartProps> = ({ data, visibleIndicators, timeframe }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const seriesRef = useRef<{ [key: string]: ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | ISeriesApi<'Histogram'> }>({});

  // Get current values for legend
  const getCurrentValues = () => {
    if (data.length === 0) return {};
    const lastDataPoint = data[data.length - 1];
    return {
      sma20: lastDataPoint.sma_20,
      sma50: lastDataPoint.sma_50,
      sma100: lastDataPoint.sma_100,
      sma150: lastDataPoint.sma_150,
      sma200: lastDataPoint.sma_200,
      rsi: lastDataPoint.rsi_14,
    };
  };

  const currentValues = getCurrentValues();

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // --- Chart Initialization ---
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: 'transparent' }, textColor: '#D1D5DB' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      rightPriceScale: { borderColor: '#4B5563' },
      timeScale: { borderColor: '#4B5563', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScale: {
        axisPressedMouseMove: true,
        axisDoubleClickReset: false,
        pinch: false,
        mouseWheel: true,
      },
      handleScroll: {
        pressedMouseMove: true,
        mouseWheel: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    const candleSeries = chartRef.current.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });
    candleSeries.setData(data.map(toCandle));
    seriesRef.current.candles = candleSeries;

    const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: 'volume_scale', lastValueVisible: false, priceLineVisible: false,
    });
    chartRef.current.priceScale('volume_scale').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeries.setData(data.map(toVolume));
    seriesRef.current.volume = volumeSeries;

    // --- Resize Handler ---
    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
      rsiChartRef.current?.applyOptions({ width: rsiContainerRef.current!.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.remove();
      rsiChartRef.current?.remove();
      chartRef.current = null;
      rsiChartRef.current = null;
      seriesRef.current = {}; // Clear all series references
    };
  }, [data]); // Only re-create charts when data changes fundamentally

  // --- Sync Logic ---
  useEffect(() => {
    const mainChart = chartRef.current;
    const rsiChart = rsiChartRef.current;
    if (!mainChart || !rsiChart) return;
    
    const syncTimeScale = (timeRange: { from: UTCTimestamp; to: UTCTimestamp } | null) => {
      if (timeRange) {
        rsiChart.timeScale().setVisibleRange(timeRange);
        mainChart.timeScale().setVisibleRange(timeRange);
      }
    };
    
    mainChart.timeScale().subscribeVisibleTimeRangeChange(syncTimeScale);
    rsiChart.timeScale().subscribeVisibleTimeRangeChange(syncTimeScale);

    return () => {
      mainChart.timeScale().unsubscribeVisibleTimeRangeChange(syncTimeScale);
      rsiChart.timeScale().unsubscribeVisibleTimeRangeChange(syncTimeScale);
    };
  }, [rsiChartRef.current]); // Re-bind when RSI chart is created/destroyed

  // --- Indicator Management ---
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || data.length === 0) return;

    Object.keys(indicatorConfig).forEach(key => {
      const isVisible = visibleIndicators[key];
      const seriesExists = !!seriesRef.current[key];
      const config = indicatorConfig[key as keyof typeof indicatorConfig];

      if (isVisible && !seriesExists) {
        const lineSeries = chart.addSeries(LineSeries, { 
          color: config.color, 
          lineWidth: 2, 
          lastValueVisible: false, 
          priceLineVisible: false
        });
        const lineData = data.map(d => toLine(d, config.key as keyof ChartDataPoint)).filter(Boolean) as LineData[];
        lineSeries.setData(lineData);
        seriesRef.current[key] = lineSeries;
      } else if (!isVisible && seriesExists) {
        const series = seriesRef.current[key];
        if (series) {
          chart.removeSeries(series);
        }
        delete seriesRef.current[key];
      }
    });

    const rsiVisible = visibleIndicators.rsi;
    const rsiSeriesExists = !!seriesRef.current.rsi;

    if (rsiVisible && !rsiSeriesExists && rsiContainerRef.current) {
        rsiChartRef.current = createChart(rsiContainerRef.current, {
             width: rsiContainerRef.current.clientWidth, height: 128, layout: { background: { color: 'transparent' }, textColor: '#D1D5DB' },
             grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } }, rightPriceScale: { borderColor: '#4B5563', visible: true },
             timeScale: { borderColor: '#4B5563', visible: true, timeVisible: true, secondsVisible: false }, crosshair: { mode: 1 },
             handleScale: { axisPressedMouseMove: false, axisDoubleClickReset: false, pinch: false, mouseWheel: true },
             handleScroll: { pressedMouseMove: true, mouseWheel: true, horzTouchDrag: true, vertTouchDrag: true },
        });
        const rsiSeries = rsiChartRef.current.addSeries(LineSeries, { 
          color: '#9c27b0', 
          lineWidth: 2, 
          lastValueVisible: true, 
          priceLineVisible: false,
        });
        const rsiData = data.map(d => toLine(d, 'rsi_14')).filter(Boolean) as LineData[];
        rsiSeries.setData(rsiData);
        seriesRef.current.rsi = rsiSeries;
        
        // Add Overbought/Oversold lines
        const overboughtLine: PriceLineOptions = { 
          price: 70, 
          color: '#ef5350', 
          lineWidth: 1, 
          lineStyle: 2, 
          axisLabelVisible: true, 
          title: 'Overbought',
          lineVisible: true,
          axisLabelColor: '#ef5350',
          axisLabelTextColor: '#ffffff',
        };
        const oversoldLine: PriceLineOptions = { 
          price: 30, 
          color: '#26a69a', 
          lineWidth: 1, 
          lineStyle: 2, 
          axisLabelVisible: true, 
          title: 'Oversold',
          lineVisible: true,
          axisLabelColor: '#26a69a',
          axisLabelTextColor: '#ffffff'
        };
        rsiSeries.createPriceLine(overboughtLine);
        rsiSeries.createPriceLine(oversoldLine);

    } else if (!rsiVisible && rsiSeriesExists) {
        rsiChartRef.current?.remove();
        rsiChartRef.current = null;
        delete seriesRef.current.rsi;
    }

  }, [visibleIndicators, data]);

  // --- Timeframe Management ---
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || data.length === 0) return;

    const timeScale = chart.timeScale();
    const lastDataPoint = data[data.length - 1];
    
    const timeframeLower = timeframe.toLowerCase();
    
    if (timeframeLower === 'all' || timeframeLower === 'max') {
        timeScale.fitContent();
        return;
    }
    
    const to = lastDataPoint.time;
    const toDate = new Date(to * 1000);
    const fromDate = new Date(toDate);

    switch(timeframeLower) {
        case '1d': fromDate.setDate(toDate.getDate() - 1); break;
        case '5d': fromDate.setDate(toDate.getDate() - 5); break;
        case '1mo': fromDate.setMonth(toDate.getMonth() - 1); break;
        case '3mo': fromDate.setMonth(toDate.getMonth() - 3); break;
        case '6mo': fromDate.setMonth(toDate.getMonth() - 6); break;
        case 'ytd': fromDate.setFullYear(toDate.getFullYear(), 0, 1); break; // Jan 1 of current year
        case '1y': fromDate.setFullYear(toDate.getFullYear() - 1); break;
        case '2y': fromDate.setFullYear(toDate.getFullYear() - 2); break;
        case '5y': fromDate.setFullYear(toDate.getFullYear() - 5); break;
        case '10y': fromDate.setFullYear(toDate.getFullYear() - 10); break;
        case 'all':
        case 'max':
            timeScale.fitContent();
            return;
    }
    
    const from = (fromDate.getTime() / 1000) as UTCTimestamp;
    timeScale.setVisibleRange({ from, to });

  }, [timeframe, data]);


  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* SMA Legend */}
      {Object.keys(indicatorConfig).some(key => visibleIndicators[key]) && (
        <div className="flex flex-wrap gap-4 mb-2 p-2 bg-gray-900/50 rounded text-xs">
          {Object.keys(indicatorConfig).map(key => {
            if (!visibleIndicators[key]) return null;
            const config = indicatorConfig[key as keyof typeof indicatorConfig];
            const value = currentValues[key as keyof typeof currentValues];
            return (
              <div key={key} className="flex items-center gap-1">
                <div 
                  className="w-3 h-0.5" 
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-gray-300">
                  {config.title}: {value ? value.toFixed(2) : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      
      <div ref={chartContainerRef} className="w-full" />
      <div
        ref={rsiContainerRef}
        className={cn(
            'w-full transition-all duration-300 overflow-hidden',
            visibleIndicators.rsi ? 'h-32 mt-2' : 'h-0'
        )}
      />
    </div>
  );
};

export default LightweightStockChart;