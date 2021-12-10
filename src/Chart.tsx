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
// import csv from "../assets/SBT_DataVisualization/price_BTC.csv"
import * as d3 from "d3";

import AreaChart from "./AreaChart";
import Volumes from "./Volumes";
import { useWindowSize } from "react-use-size";
import VolumesOnChain from "./VolumesOnChain";

// Initialize some variables

interface Price {
  date: string;
  close: number;
}
const parsePriceData = async (path: string) => {
  return (await d3.csv(path)).map((d) => ({
    close: parseInt(d?.close || "0", 10),
    date: d.time_open,
  }));
};

const parseVolumeData = async (path: string) => {
  return await d3.csv(path);
};
const btcPrices = await parsePriceData(
  "../assets/SBT_DataVisualization/price_BTC.csv"
);
const btcVolumes = await parseVolumeData(
  "../assets/SBT_DataVisualization/buy_sell_volume_BTC.csv"
);
const onChainVolumes = await parseVolumeData(
  "../assets/SBT_DataVisualization/on_chain_ETH_BTC.csv"
);

const onChainBtc = onChainVolumes.filter((v) => v.asset === "BTC");

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

function Chart({
  compact = false,
  // width,
  // height,
  margin = {
    top: 120,
    left: 50,
    bottom: 20,
    right: 20,
  },
}: BrushProps) {
  const brushRef = useRef<BaseBrush | null>(null);
  const [filteredStock, setFilteredStock] = useState(btcPrices);
  const [asset, setAsset] = useState("BTC");
  const windowSize = useWindowSize();
  const width = windowSize.width - 100;
  const height = windowSize.height - 150;
  const onBrushChange = (domain: Bounds | null) => {
    if (!domain) return;
    const { x0, x1, y0, y1 } = domain;
    const stockCopy = btcPrices.filter((s) => {
      const x = getDate(s).getTime();
      const y = getAssetValue(s);
      return x > x0 && x < x1 && y > y0 && y < y1;
    });
    setFilteredStock(stockCopy);
  };
  console.log("_______ filteredStock.length", filteredStock.length);
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
        domain: extent(btcPrices, getDate) as [Date, Date],
      }),
    [xBrushMax]
  );
  const brushStockScale = useMemo(
    () =>
      scaleLinear({
        range: [yBrushMax, 0],
        domain: [
          min(btcPrices, getAssetValue) || 0,
          max(btcPrices, getAssetValue) || 0,
        ],
        nice: true,
      }),
    [yBrushMax]
  );

  // Compute bins.
  const thresholds = filteredStock.length;
  const x = (d) => d.close;
  const y = (d) => d.volume_buy;
  const X = d3.map(btcPrices, x);
  const Y = d3.map(btcVolumes, y);
  const I = d3.range(X.length);
  const bins2 = d3.bin().thresholds(thresholds)(
    filteredStock.map((b) => b.close)
  );
  console.log("_______ bins2.length", bins2.length);
  const volumesPerBin = bins2.map((bin) => {
    const binItems = filteredStock
      .filter((p) => {
        const close = parseInt(p.close, 10);
        return bin.x0 <= close && close < bin.x1;
      })
      .map((p) => btcVolumes.find((v) => v.time_executed === p.date));

    return {
      x0: bin.x0,
      x1: bin.x1,
      totalSellVolume: d3.sum(binItems.map((item) => item.volume_sell)),
      totalBuyVolume: d3.sum(binItems.map((item) => item.volume_buy)),
    };
  });
  console.log("_______ volumesPerBin", volumesPerBin);
  const sortedVolumes = sortBy(
    volumesPerBin,
    (v) => v.totalBuyVolume + v.totalSellVolume
  ).reverse();

  console.log("_______ sortedVolumes", sortedVolumes);

  const dailyVolumes = Object.entries(groupBy(onChainVolumes, (d) => d.ts)).map(
    ([date, entries]) => ({ date, entries })
  );

  const Supports = ({ data, count = 1, color = "white", y = 0 }) =>
    data
      .slice(0, count)
      .map((d) => (
        <line
          x1={margin.right + 30}
          y1={y + margin.top + stockScale(d.x1)}
          y2={y + margin.top + stockScale(d.x1)}
          x2={margin.right + 30 + width - margin.right - margin.left}
          fill={color}
          height={2}
          stroke={color}
          strokeDasharray={5}
        />
      ));

  const onChainVolumesPerBin = bins2.map((bin) => {
    const binItems = dailyVolumes
      .filter((p) => {
        const dailyClose =
          filteredStock.find((s) => s.date === p.date)?.close || 0;
        return bin.x0 <= dailyClose && dailyClose < bin.x1;
      })
      .flatMap(({ entries }) => [...entries]);
    const toItems = binItems.filter(
      (v) =>
        v.metric === "transfers_volume_to_exchanges_sum" && v.asset === "BTC"
    );
    const fromItems = binItems.filter(
      (v) =>
        v.metric === "transfers_volume_from_exchanges_sum" && v.asset === "BTC"
    );

    return {
      x0: bin.x0,
      x1: bin.x1,
      date: bin,
      totalToBtc: d3.sum(toItems.map((item) => parseInt(item.value))),
      totalFromBtc: d3.sum(fromItems.map((item) => parseInt(item.value))),
    };
  });
  console.log("_______ onChainVolumesPerBin", onChainVolumesPerBin);
  const sortedOnChainVolumes = sortBy(
    onChainVolumesPerBin,
    (v) => v.totalToBtc + v.totalFromBtc
  ).reverse();
  console.log("_______ sortedOnChainVolumes", sortedOnChainVolumes);

  const initialBrushPosition = useMemo(
    () => ({
      start: { x: brushDateScale(getDate(btcPrices[50])) },
      end: { x: brushDateScale(getDate(btcPrices[100])) },
    }),
    [brushDateScale]
  );

  // event handlers
  const handleClearClick = () => {
    if (brushRef?.current) {
      setFilteredStock(btcPrices);
      brushRef.current.reset();
    }
  };

  const handleResetClick = () => {
    if (brushRef?.current) {
      const updater: UpdateBrush = (prevBrush) => {
        const newExtent = brushRef.current!.getExtent(
          initialBrushPosition.start,
          initialBrushPosition.end
        );

        const newState: BaseBrushState = {
          ...prevBrush,
          start: { y: newExtent.y0, x: newExtent.x0 },
          end: { y: newExtent.y1, x: newExtent.x1 },
          extent: newExtent,
        };

        return newState;
      };
      brushRef.current.updateBrush(updater);
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
        </div>

        <div>
          <label htmlFor="supportsRight">
            Buy/Sell Volume Supports: {supportsRight}
          </label>
          <input
            id="supportsRight"
            type="range"
            min={0}
            max={thresholds / 3 - 1}
            value={supportsRight}
            onChange={(e) => setSupportsRight(parseInt(e.target?.value))}
          />
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
          data={btcPrices}
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
            onClick={() => setFilteredStock(btcPrices)}
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
          xPosition={width / 2 + 40}
          data={onChainVolumesPerBin}
          keys={["totalToBtc", "totalFromBtc"]}
          width={width / 2}
          height={topChartHeight + 8 + margin.top}
          parentYScale={stockScale}
        />
        <Supports
          data={sortedVolumes}
          count={supportsLeft}
          width={width}
          height={height}
          y={0}
          x={0}
        />
        <Supports
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
        style={{ margin: "auto", display: "block", marginTop: 30 }}
      >
        Reset Selection
      </button>
      &nbsp;
    </div>
  );
}

export default Chart;
