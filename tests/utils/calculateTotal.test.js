import { describe, it, expect } from "vitest";
import { calculateTotal } from "../utils/calculateTotal";

describe("calculateTotal", () => {
  it("calculates the total correctly", () => {
    const result = calculateTotal(10, 3);

    expect(result).toBe(30);
  });

  it("returns 0 when quantity is 0", () => {
    const result = calculateTotal(10, 0);

    expect(result).toBe(0);
  });

  it("handles decimal prices", () => {
    const result = calculateTotal(10.5, 2);

    expect(result).toBe(21);
  });
});