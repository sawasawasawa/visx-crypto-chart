// @ts-nocheck
import React from "react";
import { BarStackHorizontal } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";

type CityName = "New York" | "San Francisco" | "Austin";

export type BarStackHorizontalProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  events?: boolean;
};

const defaultMargin = { top: 110, left: 50, right: 40, bottom: 0 };

type Bin = {
  x0: number;
  x1: number;
  totalBuyVolume: number;
};
// accessors
const getBucket = (d: Bin) => d.x0;

// scales
const colorScale = scaleOrdinal<CityName, string>({
  domain: [1, 2],
  range: ["rgba(0,255, 0,0.5)", "rgba(255, 0, 0,0.5)"],
});

let tooltipTimeout: number;

export default ({
  data,
  keys,
  width = 500,
  height,
  margin = defaultMargin,
}: BarStackHorizontalProps) => {
  // bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const bucketsScale = scaleBand<string>({
    domain: data.map(getBucket),
    padding: 0.8,
  });
  const volumeScale = scaleLinear<number>({
    // domain: [0, Math.max(...data.map(v=>v.totalBuyVolume+v.totalSellVolume))],
    domain: [
      0,
      Math.max(...data.map((v) => v.totalBuyVolume + v.totalSellVolume)),
    ],
    nice: true,
  });
  volumeScale.rangeRound([0, xMax]);
  bucketsScale.rangeRound([yMax, 0]);
  return width < 10 ? null : (
    <svg width={width} height={height} x={0} y={0}>
      {/*<rect width={width} height={height} fill={background} rx={14} />*/}
      <Group top={margin.top} left={margin.left}>
        <BarStackHorizontal<
          { totalBuyVolume: number; x0: number },
          "totalBuyVolume"
        >
          height={yMax}
          keys={keys}
          data={data}
          y={getBucket}
          xScale={volumeScale}
          yScale={bucketsScale}
          // yScale={parentYScale}
          color={colorScale}
        >
          {(barStacks) =>
            barStacks.map((barStack) =>
              barStack.bars.map((bar) => (
                <rect
                  key={`barstack-horizontal-${barStack.index}-${bar.index}`}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={bar.color}
                />
              ))
            )
          }
        </BarStackHorizontal>
        {/*<AxisLeft*/}
        {/*    hideAxisLine*/}
        {/*    hideTicks*/}
        {/*    // scale={bucketsScale}*/}
        {/*    scale={parentYScale}*/}
        {/*    // tickFormat={formatDate}*/}
        {/*    stroke={purple3}*/}
        {/*    tickStroke={purple3}*/}
        {/*    tickLabelProps={() => ({*/}
        {/*        fill: purple3,*/}
        {/*        fontSize: 11,*/}
        {/*        textAnchor: 'end',*/}
        {/*        dy: '0.33em',*/}
        {/*    })}*/}
        {/*/>*/}
      </Group>
    </svg>
  );
};
