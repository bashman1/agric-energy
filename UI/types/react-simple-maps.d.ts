declare module "react-simple-maps" {
  import { ComponentType, ReactNode, MouseEvent, SVGProps } from "react";

  interface ProjectionConfig {
    center?: [number, number];
    scale?: number;
    rotate?: [number, number, number];
    parallels?: [number, number];
  }

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    children?: ReactNode;
  }
  export const ComposableMap: ComponentType<ComposableMapProps>;

  interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    onMoveEnd?: (pos: { coordinates: [number, number]; zoom: number }) => void;
    children?: ReactNode;
  }
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;

  interface GeoStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    cursor?: string;
    outline?: string;
    transition?: string;
  }
  interface GeographyProps extends Omit<SVGProps<SVGPathElement>, "style"> {
    geography: GeoFeature;
    style?: { default?: GeoStyle; hover?: GeoStyle; pressed?: GeoStyle };
    onMouseEnter?: (e: MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (e: MouseEvent<SVGPathElement>) => void;
    onClick?: (e: MouseEvent<SVGPathElement>) => void;
  }
  export const Geography: ComponentType<GeographyProps>;

  interface GeoFeature {
    rsmKey: string;
    properties: Record<string, unknown>;
    geometry: object;
    type: string;
  }
  interface GeographiesProps {
    geography: object | string;
    children: (props: { geographies: GeoFeature[] }) => ReactNode;
  }
  export const Geographies: ComponentType<GeographiesProps>;

  interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
    onClick?: (e: MouseEvent<SVGGElement>) => void;
  }
  export const Marker: ComponentType<MarkerProps>;

  interface LineProps {
    from: [number, number];
    to: [number, number];
    stroke?: string;
    strokeWidth?: number;
  }
  export const Line: ComponentType<LineProps>;
}
