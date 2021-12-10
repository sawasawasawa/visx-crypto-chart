import React from 'react';
import { BarStackHorizontal } from '@visx/shape';
import { SeriesPoint } from '@visx/shape/lib/types';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import cityTemperature, { CityTemperature } from '@visx/mock-data/lib/mocks/cityTemperature';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { timeParse, timeFormat } from 'd3-time-format';
import { withTooltip, Tooltip, defaultStyles } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { LegendOrdinal } from '@visx/legend';

type CityName = 'New York' | 'San Francisco' | 'Austin';

export type BarStackHorizontalProps = {
    width: number;
    height: number;
    margin?: { top: number; right: number; bottom: number; left: number };
    events?: boolean;
};

const purple1 = '#6c5efb';
const purple2 = '#c998ff';
export const purple3 = '#a44afe';
export const background = '#eaedff';
const defaultMargin = { top: 1, left: 50, right: 40, bottom: 0 };
const tooltipStyles = {
    ...defaultStyles,
    minWidth: 60,
    backgroundColor: 'rgba(0,0,0,0.9)',
    color: 'white',
};

const data = cityTemperature.slice(0, 12);
console.log("_______ data", data)
const keys = Object.keys(data[0]).filter((d) => d !== 'date') as CityName[];

const temperatureTotals = data.reduce((allTotals, currentDate) => {
    const totalTemperature = keys.reduce((dailyTotal, k) => {
        dailyTotal += Number(currentDate[k]);
        return dailyTotal;
    }, 0);
    allTotals.push(totalTemperature);
    return allTotals;
}, [] as number[]);

const parseDate = timeParse('%Y-%m-%d');
const format = timeFormat('%b %d');
const formatDate = (date: string) => format(parseDate(date) as Date);


type Bin = {
    x0: number
    x1: number
    totalBuyVolume: number
}
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

const colorScale = scaleOrdinal<CityName, string>({
    domain: keys,
    range: ["rgba(0,255, 0,0.5)", "rgba(255, 0, 0,0.5)", purple3],
});

let tooltipTimeout: number;

export default ({
         volumesPerBin,
         width = 500,
         height ,
         margin = defaultMargin,
    parentYScale
     }: BarStackHorizontalProps) => {
        // bounds
        const xMax = width - margin.left - margin.right;
        const yMax = height - margin.top - margin.bottom;
        const bucketsScale = scaleBand<string>({
            domain: volumesPerBin.map(getBucket),
            padding: 0.8,
        });
        const volumeScale =  scaleLinear<number>({
            domain: [0, Math.max(...volumesPerBin.map(v=>v.totalBuyVolume+v.totalSellVolume))],
            nice: true,
        });
        volumeScale.rangeRound([0, xMax]);
        bucketsScale.rangeRound([yMax, 0]);
console.log("_______ bucketsScale", bucketsScale)
    console.log("_______ bucketsScale([volumesPerBin[20]]?.x0)", bucketsScale([volumesPerBin[20]]?.x0))
    console.log("_______ bucketsScale([volumesPerBin[10]]?.x0)", bucketsScale([volumesPerBin[10]]?.x0))
    console.log("_______ bucketsScale([volumesPerBin[0]]?.x0)", bucketsScale([volumesPerBin[0]]?.x0))
        temperatureScale.rangeRound([0, xMax]);
        dateScale.rangeRound([yMax, 0]);
console.log("_______ volumeScale(0), volumeScale(11110), volumeScale(111110)", volumeScale(0), volumeScale(11110), volumeScale(111110))
        console.log("_______ volumesPerBin", volumesPerBin)
console.log("_______ data, keys", data, keys)
        return width < 10 ? null : (
                <svg width={width} height={height} x={0} y={0}>
                    {/*<rect width={width} height={height} fill={background} rx={14} />*/}
                    <Group top={margin.top} left={margin.left}>
                        <BarStackHorizontal<{totalBuyVolume: number, x0: number}, "totalBuyVolume">

                            height={yMax}
                            // keys={keys}
                            // keys={["Austin"]}
                            // y={getDate}
                            // xScale={temperatureScale}
                            // yScale={dateScale}
                            // data={data}

                            // keys={keys}
                            keys={["totalBuyVolume", "totalSellVolume"]}
                            data={volumesPerBin}
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
                                    )),
                                )
                            }
                        </BarStackHorizontal>
                        <AxisLeft
                            hideAxisLine
                            hideTicks
                            // scale={bucketsScale}
                            scale={parentYScale}
                            // tickFormat={formatDate}
                            stroke={purple3}
                            tickStroke={purple3}
                            tickLabelProps={() => ({
                                fill: purple3,
                                fontSize: 11,
                                textAnchor: 'end',
                                dy: '0.33em',
                            })}
                        />
                    </Group>

                </svg>

        );
    }
