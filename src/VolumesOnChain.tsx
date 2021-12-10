import React from "react";
import { BarStackHorizontal } from "@visx/shape";
import { Group } from "@visx/group";
import cityTemperature, {
  CityTemperature,
} from "@visx/mock-data/lib/mocks/cityTemperature";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { timeParse, timeFormat } from "d3-time-format";
import { defaultStyles } from "@visx/tooltip";

export type BarStackHorizontalProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  events?: boolean;
};

export const purple3 = "#a44afe";
export const background = "#eaedff";
const defaultMargin = { top: 110, left: 50, right: 40, bottom: 0 };
const tooltipStyles = {
  ...defaultStyles,
  minWidth: 60,
  backgroundColor: "rgba(0,0,0,0.9)",
  color: "white",
};

const data = cityTemperature.slice(0, 12);
const keys = Object.keys(data[0]).filter((d) => d !== "date") as CityName[];

const temperatureTotals = data.reduce((allTotals, currentDate) => {
  const totalTemperature = keys.reduce((dailyTotal, k) => {
    dailyTotal += Number(currentDate[k]);
    return dailyTotal;
  }, 0);
  allTotals.push(totalTemperature);
  return allTotals;
}, [] as number[]);

const parseDate = timeParse("%Y-%m-%d");
const format = timeFormat("%b %d");
const formatDate = (date: string) => format(parseDate(date) as Date);

type Bin = {
  x0: number;
  x1: number;
  totalBuyVolume: number;
};
// accessors
const getDate = (d: CityTemperature) => d.date;
const getBucket = (d: Bin) => d.x0;

// scales
const temperatureScale = scaleLinear<number>({
  domain: [0, Math.max(...temperatureTotals)],
  nice: true,
});
const dateScale = scaleBand<string>({
  domain: data.map(getDate),
  padding: 0.2,
});

const colorScale = scaleOrdinal<[], string>({
  domain: keys,
  range: ["rgba(0,255, 0,0.5)", "rgba(255, 0, 0,0.5)"],
});

let tooltipTimeout: number;

export default ({
  data,
  keys,
  width = 500,
  height,
  margin = defaultMargin,
  xPosition,
}: BarStackHorizontalProps) => {
  // bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const bucketsScale = scaleBand<string>({
    domain: data.map(getBucket),
    padding: 0.8,
  });
  const volumeScale = scaleLinear<number>({
    domain: [0, Math.max(...data.map((v) => v.totalToBtc + v.totalFromBtc))],
    nice: true,
  });
  volumeScale.rangeRound([0, xMax]);
  bucketsScale.rangeRound([yMax, 0]);
  temperatureScale.rangeRound([0, xMax]);
  dateScale.rangeRound([yMax, 0]);
  const maxx = Math.max(...data.map((v) => v.totalToBtc + v.totalFromBtc));
  return width < 10 ? null : (
    <svg width={width} height={height} x={xPosition} y={0}>
      <Group top={margin.top} left={margin.left}>
        <BarStackHorizontal<any, "totalBuyVolume">
          height={yMax}
          keys={keys}
          data={data}
          y={getBucket}
          xScale={volumeScale}
          yScale={bucketsScale}
          color={colorScale}
        >
          {(barStacks) =>
            barStacks.map((barStack) =>
              barStack.bars.map((bar) => {
                const offset = volumeScale(maxx - (bar.bar[0] + bar.bar[1]));
                return (
                  <rect
                    key={`barstack-horizontal-${barStack.index}-${bar.index}`}
                    x={bar.x + offset}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    fill={bar.color}
                  />
                );
              })
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
