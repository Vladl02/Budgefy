import React, { useMemo } from "react";
import * as d3 from "d3-shape";
import Svg, { G, Path } from "react-native-svg";

type DonutChartProps = {
  size: number;
  strokeWidth: number;
  data: { value: number; color: string }[];
};

export function DonutChart({ size, strokeWidth, data }: DonutChartProps) {
  const radius = size / 2;
  const innerRadius = radius - strokeWidth;

  const arcs = useMemo(() => {
    const pie = d3.pie<{ value: number; color: string }>().value((d) => d.value).sort(null);
    return pie(data);
  }, [data]);

  const arcGen = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<{ value: number; color: string }>>()
        .outerRadius(radius)
        .innerRadius(innerRadius)
        .padAngle(data.length > 1 ? 0.02 : 0),
    [data.length, innerRadius, radius]
  );

  return (
    <Svg width={size} height={size}>
      <G x={radius} y={radius}>
        {arcs.map((a, idx) => (
          <Path key={idx} d={arcGen(a) || ""} fill={a.data.color} />
        ))}
      </G>
    </Svg>
  );
}
