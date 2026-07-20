import { describe, it, expect } from "vitest";
import {
  positionIcon,
  customIcon,
  cycleCornersIcon,
  cycleSidesIcon,
  cycleTopBottomIcon,
  svgToDataUri,
} from "../../src/icons/position-icon";

const rectCount = (svg: string): number => (svg.match(/<rect/g) ?? []).length;

describe("positionIcon", () => {
  it("includes the accent color", () => {
    expect(positionIcon("left-half", "#3B99FC")).toContain("#3B99FC");
  });

  it("draws the active tile at full opacity and neighbours dimmed", () => {
    const svg = positionIcon("left-half", "#ffffff");
    expect(svg).toContain('fill-opacity="1"'); // active half
    expect(svg).toContain('fill-opacity="0.22"'); // dimmed other half
  });

  it("left-half active tile is inset from the left edge (x=20, INSET=4)", () => {
    expect(positionIcon("left-half", "#ffffff")).toContain('x="20"');
  });

  it("right-half active tile starts mid-screen (x=76)", () => {
    const svg = positionIcon("right-half", "#ffffff");
    // active tile: x = 16 + 56 + 4 = 76, full opacity
    expect(svg).toContain('x="76"');
  });

  it("maximize is a single full-screen tile with no dimmed neighbours", () => {
    const svg = positionIcon("maximize", "#ffffff");
    expect(rectCount(svg)).toBe(1);
    expect(svg).toContain('width="104"'); // 112 - 2*4
    expect(svg).not.toContain('fill-opacity="0.22"');
  });

  it("center is a dimmed screen plus a smaller centered active box (width=59.2)", () => {
    const svg = positionIcon("center", "#ffffff");
    expect(rectCount(svg)).toBe(2);
    expect(svg).toContain('fill-opacity="0.22"'); // dimmed full screen
    expect(svg).toContain('width="59.2"'); // active: 0.6*112 - 8
  });

  it("draws the full grid each position implies", () => {
    expect(rectCount(positionIcon("left-half", "#fff"))).toBe(2);
    expect(rectCount(positionIcon("left-third", "#fff"))).toBe(3);
    expect(rectCount(positionIcon("top-left", "#fff"))).toBe(4);
  });

  it("distinct positions render differently", () => {
    expect(positionIcon("top-left", "#ffffff")).not.toEqual(positionIcon("bottom-right", "#ffffff"));
  });
});

describe("customIcon", () => {
  it("includes the accent color", () => {
    expect(customIcon("#30D158")).toContain("#30D158");
  });
});

describe("cycleCornersIcon", () => {
  it("includes the accent color", () => {
    expect(cycleCornersIcon("#7C5CFF")).toContain("#7C5CFF");
  });
  it("draws four dimmed corner tiles", () => {
    const svg = cycleCornersIcon("#ffffff");
    expect(rectCount(svg)).toBe(4);
    expect((svg.match(/fill-opacity="0.22"/g) ?? []).length).toBe(4);
  });
  it("draws a stroked circular arrow", () => {
    const svg = cycleCornersIcon("#ffffff");
    expect(svg).toContain("stroke=");
    expect(svg).toContain("<path");
  });
});

describe("cycleSidesIcon / cycleTopBottomIcon", () => {
  it("draws two dimmed half tiles plus a double-headed arrow (shaft + 2 heads)", () => {
    for (const svg of [cycleSidesIcon("#ffffff"), cycleTopBottomIcon("#ffffff")]) {
      expect(rectCount(svg)).toBe(2);
      expect((svg.match(/fill-opacity="0.22"/g) ?? []).length).toBe(2);
      expect(svg).toContain("stroke=");
      expect((svg.match(/<path/g) ?? []).length).toBe(3); // shaft + 2 arrowheads
    }
  });
  it("sides and top/bottom render differently (horizontal vs vertical)", () => {
    expect(cycleSidesIcon("#fff")).not.toEqual(cycleTopBottomIcon("#fff"));
  });
});

describe("svgToDataUri", () => {
  it("produces an svg+xml base64 data uri", () => {
    expect(svgToDataUri("<svg/>").startsWith("data:image/svg+xml;base64,")).toBe(true);
  });
});
