import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
  HistogramData,
  LineData,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';

interface ChartDataPoint {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TrendLine {
  startTime: UTCTimestamp;
  startPrice: number;
  endTime: UTCTimestamp;
  endPrice: number;
}

enum DrawMode {
  None = 'none',
  Line = 'line',
}

interface LightweightStockChartProps {
  data: ChartDataPoint[];
}

const toSeriesData = (rawData: ChartDataPoint[]) => {
  const candles: CandlestickData[] = [];
  const volume: HistogramData[] = [];

  rawData.forEach(d => {
    candles.push({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    });
    volume.push({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    });
  });
  
  return { candles, volume };
};

const LightweightStockChart: React.FC<LightweightStockChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [drawMode, setDrawMode] = useState<DrawMode>(DrawMode.None);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const pendingPointRef = useRef<{ time: UTCTimestamp; price: number } | null>(null);

  const drawLines = useCallback(() => {
    if (!canvasRef.current || !chartRef.current || !candleSeriesRef.current) return;

    const canvas = canvasRef.current;
    const container = chartContainerRef.current;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;

    trendLines.forEach(line => {
      const x1 = chartRef.current!.timeScale().timeToCoordinate(line.startTime);
      const x2 = chartRef.current!.timeScale().timeToCoordinate(line.endTime);
      if (x1 === null || x2 === null) return;
      const y1 = candleSeriesRef.current!.priceToCoordinate(line.startPrice);
      const y2 = candleSeriesRef.current!.priceToCoordinate(line.endPrice);
      if (y1 === null || y2 === null) return;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }, [trendLines]);

  useEffect(() => {
    drawLines();
  }, [drawLines]);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: 'transparent' }, textColor: '#D1D5DB' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      rightPriceScale: { borderColor: '#4B5563' },
      timeScale: { borderColor: '#4B5563', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', // green-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    
    const { candles, volume } = toSeriesData(data);
    candleSeries.setData(candles);
    volumeSeries.setData(volume);

    candleSeriesRef.current = candleSeries;

    // --- Drawing subscriptions ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChartClick = (param: any) => {
      if (drawMode !== DrawMode.Line || !param.point || param.time === undefined) {
        return;
      }
      if (!candleSeriesRef.current) return;
      const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) return;

      if (!pendingPointRef.current) {
        pendingPointRef.current = { time: param.time as UTCTimestamp, price };
      } else {
        const newLine: TrendLine = {
          startTime: pendingPointRef.current.time,
          startPrice: pendingPointRef.current.price,
          endTime: param.time as UTCTimestamp,
          endPrice: price,
        };
        setTrendLines(prev => [...prev, newLine]);
        pendingPointRef.current = null;
      }
    };

    chart.subscribeClick(handleChartClick);
    const timeScale = chart.timeScale();
    const handleRangeChange = () => {
      drawLines();
    };
    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);

    // resize redraw also
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        drawLines();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeClick(handleChartClick);
      timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [data, drawMode, drawLines]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={chartContainerRef} style={{ width: '100%' }} />
      {/* Drawing canvas overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {/* Simple toolbar */}
      <div
        style={{ position: 'absolute', top: 8, left: 8, zIndex: 20 }}
        className="flex gap-2"
      >
        <button
          onClick={() =>
            setDrawMode(prev => (prev === DrawMode.Line ? DrawMode.None : DrawMode.Line))
          }
          className={`px-2 py-1 rounded text-sm ${drawMode === DrawMode.Line ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}
        >
          {drawMode === DrawMode.Line ? 'Stop Drawing' : 'Draw Line'}
        </button>
        <button
          onClick={() => {
            setTrendLines([]);
            pendingPointRef.current = null;
            drawLines();
          }}
          className="px-2 py-1 rounded text-sm bg-red-600 text-white"
        >
          Clear Lines
        </button>
      </div>
    </div>
  );
};

export default LightweightStockChart;