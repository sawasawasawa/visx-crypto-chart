// @ts-nocheck
import React from "react";

export const Supports = ({
  data,
  count = 1,
  color = "white",
  y = 0,
  margin,
  width,
  yScale,
}) =>
  data
    .slice(0, count)
    .map((d, i) => (
      <line
        key={i}
        x1={margin.right + 30}
        y1={y + margin.top + yScale(d.x1)}
        y2={y + margin.top + yScale(d.x1)}
        x2={margin.right + 30 + width - margin.right - margin.left}
        fill={color}
        height={2}
        stroke={color}
        strokeDasharray={5}
      />
    ));
