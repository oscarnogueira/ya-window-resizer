import { describe, it, expect } from "vitest";
import { positionIcon, customIcon, svgToDataUri } from "../../src/icons/position-icon";

describe("positionIcon", () => {
  it("includes the accent color", () => {
    expect(positionIcon("left-half", "#3B99FC")).toContain("#3B99FC");
  });
  it("left-half active rect starts at the left edge (x=19)", () => {
    expect(positionIcon("left-half", "#ffffff")).toContain('x="19"');
  });
  it("right-half active rect starts mid-screen (x=75)", () => {
    expect(positionIcon("right-half", "#ffffff")).toContain('x="75"');
  });
  it("maximize fills nearly the whole screen frame (width=106)", () => {
    expect(positionIcon("maximize", "#ffffff")).toContain('width="106"');
  });
  it("center is a smaller centered box (width=61.2)", () => {
    expect(positionIcon("center", "#ffffff")).toContain('width="61.2"');
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

describe("svgToDataUri", () => {
  it("produces an svg+xml base64 data uri", () => {
    expect(svgToDataUri("<svg/>").startsWith("data:image/svg+xml;base64,")).toBe(true);
  });
});
