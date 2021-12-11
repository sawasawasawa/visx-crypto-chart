// @ts-nocheck
import React, { useRef, useState, useMemo } from "react";
import { scaleTime, scaleLinear } from "@visx/scale";
import { Brush } from "@visx/brush";
import { Bounds } from "@visx/brush/lib/types";
import BaseBrush, {
  BaseBrushState,
  UpdateBrush,
} from "@visx/brush/lib/BaseBrush";
import { PatternLines } from "@visx/pattern";
import { LinearGradient } from "@visx/gradient";
import { max, extent, min } from "d3-array";
import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";
import * as d3 from "d3";

import AreaChart from "./AreaChart";
import Volumes from "./Volumes";
import { useWindowSize } from "react-use-size";
import VolumesOnChain from "./VolumesOnChain";
import { Supports } from "./Supports";

interface Price {
  date: string;
  close: number;
}

const brushMargin = { top: 10, bottom: 15, left: 50, right: 20 };
const chartSeparation = 30;
const PATTERN_ID = "brush_pattern";
const GRADIENT_ID = "brush_gradient";
export const accentColor = "#f6acc8";
export const background = "#584153";
export const background2 = "#af8baf";
const selectedBrushStyle = {
  fill: `url(#${PATTERN_ID})`,
  stroke: "white",
};

// accessors
const getDate = (d: Price) => new Date(d?.date);
const getAssetValue = (d: Price) => d?.close;

export type BrushProps = {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  compact?: boolean;
};
const defaultAsset = "BTC";

function Chart({
  btcPrices,
  ethPrices,
  btcVolumes,
  ethVolumes,
  onChainVolumes,
  compact = false,
  margin = {
    top: 120,
    left: 50,
    bottom: 20,
    right: 20,
  },
}: BrushProps) {
  console.log("___2____ btcPrices", btcPrices);
  // console.log("_______ btcVolumes", btcVolumes);
  const brushRef = useRef<BaseBrush | null>(null);
  const [asset, setAsset] = useState(defaultAsset);
  const prices = asset === "BTC" ? btcPrices : ethPrices;
  const [filteredStock, setFilteredStock] = useState(prices);
  const windowSize = useWindowSize();
  const width = windowSize.width - 100;
  const height = windowSize.height - 150;
  const onBrushChange = (domain: Bounds | null) => {
    if (!domain) return;
    const { x0, x1, y0, y1 } = domain;
    const stockCopy = prices.filter((s) => {
      const x = getDate(s).getTime();
      const y = getAssetValue(s);
      return x > x0 && x < x1 && y > y0 && y < y1;
    });
    setFilteredStock(stockCopy);
  };
  const innerHeight = height - margin.top - margin.bottom;
  const topChartBottomMargin = compact
    ? chartSeparation / 2
    : chartSeparation + 10;
  const topChartHeight = 0.8 * innerHeight - topChartBottomMargin;
  const bottomChartHeight = innerHeight - topChartHeight - chartSeparation;

  // bounds
  const xMax = Math.max(width - margin.left - margin.right, 0);
  const yMax = Math.max(topChartHeight, 0);
  const xBrushMax = Math.max(width - brushMargin.left - brushMargin.right, 0);
  const yBrushMax = Math.max(
    bottomChartHeight - brushMargin.top - brushMargin.bottom,
    0
  );

  // scales
  const dateScale = useMemo(
    () =>
      scaleTime<number>({
        range: [0, xMax],
        domain: extent(filteredStock, getDate) as [Date, Date],
      }),
    [xMax, filteredStock]
  );
  const stockScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        domain: [
          min(filteredStock, getAssetValue) * 1,
          max(filteredStock, getAssetValue) || 0,
        ],
        nice: true,
      }),
    [yMax, filteredStock]
  );
  const brushDateScale = useMemo(
    () =>
      scaleTime<number>({
        range: [0, xBrushMax],
        domain: extent(prices, getDate) as [Date, Date],
      }),
    [xBrushMax, asset]
  );
  const brushStockScale = useMemo(
    () =>
      scaleLinear({
        range: [yBrushMax, 0],
        domain: [
          min(prices, getAssetValue) || 0,
          max(prices, getAssetValue) || 0,
        ],
        nice: true,
      }),
    [yBrushMax, asset]
  );

  // Compute bins.
  const thresholds = filteredStock.length;

  const bins = d3.bin().thresholds(thresholds)(
    filteredStock.map((b) => b.close)
  );
  const volumesPerBin = bins.map((bin) => {
    const binItems = filteredStock
      .filter((p) => {
        const close = parseInt(p.close, 10);
        return bin.x0 <= close && close < bin.x1;
      })
      .map((p) =>
        (asset === "BTC" ? btcVolumes : ethVolumes).find(
          (v) => v.time_executed === p.date
        )
      );

    return {
      x0: bin.x0,
      x1: bin.x1,
      totalSellVolume: d3.sum(binItems.map((item) => item.volume_sell)),
      totalBuyVolume: d3.sum(binItems.map((item) => item.volume_buy)),
    };
  });
  const sortedVolumes = sortBy(
    volumesPerBin,
    (v) => v.totalBuyVolume + v.totalSellVolume
  ).reverse();

  const dailyVolumes = Object.entries(groupBy(onChainVolumes, (d) => d.ts)).map(
    ([date, entries]) => ({ date, entries })
  );

  const onChainVolumesPerBin = bins.map((bin) => {
    const binItems = dailyVolumes
      .filter((p) => {
        const dailyClose =
          filteredStock.find((s) => s.date === p.date)?.close || 0;
        return bin.x0 <= dailyClose && dailyClose < bin.x1;
      })
      .flatMap(({ entries }) => [...entries]);
    const toBtcItems = binItems.filter(
      (v) =>
        v.metric === "transfers_volume_to_exchanges_sum" && v.asset === "BTC"
    );
    const fromBtcItems = binItems.filter(
      (v) =>
        v.metric === "transfers_volume_from_exchanges_sum" && v.asset === "BTC"
    );
    const toEthItems = binItems.filter(
      (v) =>
        v.metric === "transfers_volume_to_exchanges_sum" && v.asset === "ETH"
    );
    const fromEthItems = binItems.filter(
      (v) =>
        v.metric === "transfers_volume_from_exchanges_sum" && v.asset === "ETH"
    );

    return {
      x0: bin.x0,
      x1: bin.x1,
      date: bin,
      totalToBtc: d3.sum(toBtcItems.map((item) => parseInt(item.value))),
      totalFromBtc: d3.sum(fromBtcItems.map((item) => parseInt(item.value))),
      totalToEth: d3.sum(toEthItems.map((item) => parseInt(item.value))),
      totalFromEth: d3.sum(fromEthItems.map((item) => parseInt(item.value))),
    };
  });

  const sortedOnChainVolumes = sortBy(
    onChainVolumesPerBin,
    (v) => v.totalToBtc + v.totalFromBtc
  ).reverse();

  const initialBrushPosition = useMemo(
    () => ({
      start: { x: brushDateScale(getDate(prices[50])) },
      end: { x: brushDateScale(getDate(prices[100])) },
    }),
    [brushDateScale]
  );

  // event handlers
  const handleClearClick = () => {
    if (brushRef?.current) {
      setFilteredStock(prices);
      brushRef.current.reset();
    }
  };

  const [supportsLeft, setSupportsLeft] = useState(1);
  const [supportsRight, setSupportsRight] = useState(1);
  return (
    <div
      style={{
        padding: 50,
        background: `linear-gradient(${background}, ${background2})`,
      }}
    >
      <div
        className="inputs"
        style={{
          display: "flex",
          justifyContent: "space-between",
          position: "absolute",
          padding: 30,
          width: `calc(100% - ${margin.left + margin.right + 30}px)`,
        }}
      >
        <div>
          <label htmlFor="supportsLeft">
            Buy/Sell Volume Supports: {supportsLeft}
          </label>

          <input
            id="supportsLeft"
            type="range"
            min={0}
            max={thresholds / 3 - 1}
            value={supportsLeft}
            onChange={(e) => setSupportsLeft(parseInt(e.target?.value))}
          />

          <em style={{ marginTop: 10 }}>
            <span style={{ color: "green" }}>Buy </span>/
            <span style={{ color: "red" }}> Sell</span> {asset} volume
          </em>
        </div>
        <div
          onClick={() => {
            setAsset((s) => {
              setFilteredStock(s === "ETH" ? btcPrices : ethPrices);
              return s === "BTC" ? "ETH" : "BTC";
            });
          }}
        >
          <h1 style={{ opacity: asset === "BTC" ? 1 : 0.2 }}>BTC</h1>
          <h1 style={{ opacity: 0.2 }}>/</h1>
          <h1 style={{ opacity: asset === "ETH" ? 1 : 0.2 }}>ETH</h1>
        </div>
        <div>
          <label htmlFor="supportsRight">
            From/To On Chain Supports: {supportsRight}
          </label>
          <input
            id="supportsRight"
            type="range"
            min={0}
            max={thresholds / 3 - 1}
            value={supportsRight}
            onChange={(e) => setSupportsRight(parseInt(e.target?.value))}
          />
          <em style={{ marginTop: 10 }}>
            <span style={{ color: "red" }}>From </span>/
            <span style={{ color: "green" }}> To </span>
            Chain {asset} volume
          </em>
        </div>
      </div>
      <svg
        width={width}
        height={height}
        style={{
          borderRadius: 14,
          boxShadow: `rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px`,
        }}
      >
        <LinearGradient
          id={GRADIENT_ID}
          from={background}
          to={background2}
          rotate={45}
        />
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`url(#${GRADIENT_ID})`}
          rx={14}
        />
        <AreaChart
          hideBottomAxis={compact}
          data={filteredStock}
          width={width}
          margin={{ ...margin, bottom: topChartBottomMargin }}
          yMax={yMax}
          xScale={dateScale}
          yScale={stockScale}
          gradientColor={background2}
        />
        <AreaChart
          hideBottomAxis
          hideLeftAxis
          data={prices}
          width={width}
          yMax={yBrushMax}
          xScale={brushDateScale}
          yScale={brushStockScale}
          margin={brushMargin}
          top={topChartHeight + topChartBottomMargin + margin.top}
          gradientColor={background2}
        >
          <PatternLines
            id={PATTERN_ID}
            height={8}
            width={8}
            stroke={accentColor}
            strokeWidth={1}
            orientation={["diagonal"]}
          />
          <Brush
            xScale={brushDateScale}
            yScale={brushStockScale}
            width={xBrushMax}
            height={yBrushMax}
            margin={brushMargin}
            handleSize={8}
            innerRef={brushRef}
            resizeTriggerAreas={["left", "right"]}
            brushDirection="horizontal"
            initialBrushPosition={initialBrushPosition}
            onChange={onBrushChange}
            onClick={() => setFilteredStock(prices)}
            selectedBoxStyle={selectedBrushStyle}
            useWindowMoveEvents
          />
        </AreaChart>
        <Volumes
          data={volumesPerBin}
          keys={["totalBuyVolume", "totalSellVolume"]}
          width={width / 2}
          height={topChartHeight + 8 + margin.top}
          parentYScale={stockScale}
        />
        <VolumesOnChain
          xPosition={(width + margin.left) / 2}
          data={onChainVolumesPerBin}
          keys={["totalToBtc", "totalFromBtc"]}
          width={(width + margin.left + margin.right) / 2}
          height={topChartHeight + 8 + margin.top}
          parentYScale={stockScale}
        />
        <Supports
          margin={margin}
          yScale={stockScale}
          data={sortedVolumes}
          count={supportsLeft}
          width={width}
          height={height}
          y={0}
          x={0}
        />
        <Supports
          margin={margin}
          yScale={stockScale}
          data={sortedOnChainVolumes}
          count={supportsRight}
          width={width}
          height={height}
          color={"blue"}
          y={2}
          x={0}
        />
      </svg>
      <button
        onClick={handleClearClick}
        disabled={!brushRef?.current}
        style={{ margin: "auto", display: "block", marginTop: 30 }}
      >
        Reset Selection
      </button>
      &nbsp;
    </div>
  );
}

export default Chart;
