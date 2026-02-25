declare module "d3-shape" {
  export interface PieArcDatum<T> {
    data: T;
    value: number;
    index: number;
    startAngle: number;
    endAngle: number;
    padAngle: number;
  }

  export interface PieGenerator<T> {
    (data: T[]): PieArcDatum<T>[];
    value(accessor: (datum: T) => number): PieGenerator<T>;
    sort(comparator: ((a: T, b: T) => number) | null): PieGenerator<T>;
  }

  export function pie<T>(): PieGenerator<T>;

  export interface ArcGenerator<T> {
    (datum: T): string | null;
    outerRadius(radius: number): ArcGenerator<T>;
    innerRadius(radius: number): ArcGenerator<T>;
    padAngle(angle: number): ArcGenerator<T>;
  }

  export function arc<T>(): ArcGenerator<T>;
}
