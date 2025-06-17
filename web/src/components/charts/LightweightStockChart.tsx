// web/src/components/charts/LightweightStockChart.tsx
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
  visibleIndicators: { [key:string]: boolean };
  timeframe: string;
  containerWidth: number;
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

const LightweightStockChart: React.FC<LightweightStockChartProps> = ({ data, visibleIndicators, timeframe, containerWidth }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const seriesRef = useRef<{ [key: string]: ISeriesApi<any> }>({});

  // --- Chart Initialization & Cleanup ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chartHeight = window.innerWidth < 768 ? 300 : 400;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: chartHeight,
      layout: { background: { color: 'transparent' }, textColor: '#D1D5DB' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      rightPriceScale: { borderColor: '#4B5563' },
      timeScale: { borderColor: '#4B5563', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScale: { axisPressedMouseMove: true, axisDoubleClickReset: false, pinch: false, mouseWheel: true },
      handleScroll: { pressedMouseMove: true, mouseWheel: true, horzTouchDrag: true, vertTouchDrag: true },
    });
    chartRef.current = chart;

    // Create base series that are always present
    seriesRef.current.candles = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });
    seriesRef.current.volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: 'volume_scale', lastValueVisible: false, priceLineVisible: false,
    });
    chart.priceScale('volume_scale').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    return () => {
      chart.remove();
      chartRef.current = null;
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
      seriesRef.current = {};
    };
  }, []);

  // --- Resize charts when containerWidth prop changes ---
  useEffect(() => {
    if (containerWidth > 0) {
      chartRef.current?.resize(containerWidth, undefined);
      rsiChartRef.current?.resize(containerWidth, undefined);
    }
  }, [containerWidth]);

  // --- Sync Time Scales ---
  useEffect(() => {
    const mainChart = chartRef.current;
    const rsiChart = rsiChartRef.current;
    if (!mainChart || !rsiChart) return;
    
    const syncTimeScale = (timeRange: { from: UTCTimestamp; to: UTCTimestamp } | null) => {
      if (timeRange) {
        // Prevent feedback loop
        if (mainChart.timeScale().getVisibleRange()?.from !== timeRange.from) {
          mainChart.timeScale().setVisibleRange(timeRange);
        }
        if (rsiChart.timeScale().getVisibleRange()?.from !== timeRange.from) {
          rsiChart.timeScale().setVisibleRange(timeRange);
        }
      }
    };
    
    mainChart.timeScale().subscribeVisibleTimeRangeChange(syncTimeScale);
    rsiChart.timeScale().subscribeVisibleTimeRangeChange(syncTimeScale);

    return () => {
      mainChart.timeScale().unsubscribeVisibleTimeRangeChange(syncTimeScale);
      rsiChart.timeScale().unsubscribeVisibleTimeRangeChange(syncTimeScale);
    };
  }, [chartRef.current, rsiChartRef.current]);

  // --- Data, Indicators, and Timeframe Management ---
  useEffect(() => {
    const mainChart = chartRef.current;
    if (!mainChart) return;

    // Set data for base series
    seriesRef.current.candles?.setData(data.map(toCandle));
    seriesRef.current.volume?.setData(data.map(toVolume));

    // Manage SMA indicators
    Object.keys(indicatorConfig).forEach(key => {
      const isVisible = visibleIndicators[key];
      const seriesExists = !!seriesRef.current[key];
      
      if (isVisible) {
        const config = indicatorConfig[key as keyof typeof indicatorConfig];
        const lineData = data.map(d => toLine(d, config.key as keyof ChartDataPoint)).filter(Boolean) as LineData[];
        if (!seriesExists) {
          seriesRef.current[key] = mainChart.addSeries(LineSeries, { color: config.color, lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
        }
        seriesRef.current[key].setData(lineData);
      } else if (seriesExists) {
        mainChart.removeSeries(seriesRef.current[key]);
        delete seriesRef.current[key];
      }
    });
    
    // Manage RSI indicator
    const rsiVisible = visibleIndicators.rsi;
    const rsiSeriesExists = !!seriesRef.current.rsi;
    const rsiContainer = rsiContainerRef.current;

    if (rsiVisible) {
      const rsiData = data.map(d => toLine(d, 'rsi_14')).filter(Boolean) as LineData[];
      if (!rsiSeriesExists && rsiContainer) {
        const rsiHeight = window.innerWidth < 768 ? 100 : 128;
        const rsiChart = createChart(rsiContainer, {
          width: containerWidth > 0 ? containerWidth : rsiContainer.clientWidth, height: rsiHeight,
          layout: { background: { color: 'transparent' }, textColor: '#D1D5DB' },
          grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
          rightPriceScale: { borderColor: '#4B5563', visible: true },
          timeScale: { borderColor: '#4B5563', visible: true, timeVisible: true, secondsVisible: false },
          crosshair: { mode: 1 },
          handleScale: { axisPressedMouseMove: false, axisDoubleClickReset: false, pinch: false, mouseWheel: true },
          handleScroll: { pressedMouseMove: true, mouseWheel: true, horzTouchDrag: true, vertTouchDrag: true },
        });
        rsiChartRef.current = rsiChart;
        seriesRef.current.rsi = rsiChart.addSeries(LineSeries, { color: '#9c27b0', lineWidth: 2, lastValueVisible: true, priceLineVisible: false });
        
        const overboughtLine: PriceLineOptions = { price: 70, color: '#ef5350', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Overbought', lineVisible: true, axisLabelColor: '#ef5350', axisLabelTextColor: '#ffffff' };
        const oversoldLine: PriceLineOptions = { price: 30, color: '#26a69a', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Oversold', lineVisible: true, axisLabelColor: '#26a69a', axisLabelTextColor: '#ffffff' };
        seriesRef.current.rsi.createPriceLine(overboughtLine);
        seriesRef.current.rsi.createPriceLine(oversoldLine);
      }
      if (seriesRef.current.rsi) {
          seriesRef.current.rsi.setData(rsiData);
      }
    } else if (rsiSeriesExists) {
      rsiChartRef.current?.remove();
      rsiChartRef.current = null;
      delete seriesRef.current.rsi;
    }

    // Set timeframe
    if (data.length > 0) {
      const timeScale = mainChart.timeScale();
      const timeframeLower = timeframe.toLowerCase();
      if (timeframeLower === 'all' || timeframeLower === 'max') {
        timeScale.fitContent();
      } else {
        const to = data[data.length - 1].time;
        const toDate = new Date(to * 1000);
        const fromDate = new Date(toDate);
        switch (timeframeLower) {
          case '1d': fromDate.setDate(toDate.getDate() - 1); break;
          case '5d': fromDate.setDate(toDate.getDate() - 5); break;
          case '1mo': fromDate.setMonth(toDate.getMonth() - 1); break;
          case '3mo': fromDate.setMonth(toDate.getMonth() - 3); break;
          case '6mo': fromDate.setMonth(toDate.getMonth() - 6); break;
          case 'ytd': fromDate.setFullYear(toDate.getFullYear(), 0, 1); break;
          case '1y': fromDate.setFullYear(toDate.getFullYear() - 1); break;
          case '2y': fromDate.setFullYear(toDate.getFullYear() - 2); break;
          case '5y': fromDate.setFullYear(toDate.getFullYear() - 5); break;
          case '10y': fromDate.setFullYear(toDate.getFullYear() - 10); break;
          default: break;
        }
        const from = (fromDate.getTime() / 1000) as UTCTimestamp;
        timeScale.setVisibleRange({ from, to });
      }
    }

  }, [data, visibleIndicators, timeframe, containerWidth]);

  const currentValues = data.length > 0 ? data[data.length-1] : {};

  return (
    <div className="relative min-w-0">
      {Object.keys(indicatorConfig).some(key => visibleIndicators[key]) && (
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-2 p-2 bg-gray-900/50 rounded text-xs overflow-x-auto">
          {Object.keys(indicatorConfig).map(key => {
            if (!visibleIndicators[key]) return null;
            const config = indicatorConfig[key as keyof typeof indicatorConfig];
            const value = currentValues[config.key as keyof typeof currentValues];
            return (
              <div key={key} className="flex items-center gap-1 flex-shrink-0">
                <div className="w-3 h-0.5" style={{ backgroundColor: config.color }} />
                <span className="text-gray-300 whitespace-nowrap">
                  {config.title}: {value ? (value as number).toFixed(2) : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
      <div
        ref={rsiContainerRef}
        className={cn('w-full transition-all duration-300 overflow-hidden', visibleIndicators.rsi ? 'h-24 sm:h-32 mt-2' : 'h-0')}
      />
    </div>
  );
};

export default LightweightStockChart;