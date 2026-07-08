import { describe, it, expect } from "vitest";
import { extractQrId } from "./qr";

describe("extractQrId", () => {
  it("pulls the code out of a scanned label URL", () => {
    expect(extractQrId("http://192.168.0.12:8080/u/A4F2K7")).toBe("A4F2K7");
    expect(extractQrId("https://coffeelog.local/u/xk9d2p")).toBe("XK9D2P");
  });
  it("accepts a bare code", () => {
    expect(extractQrId("A4F2K7")).toBe("A4F2K7");
  });
  it("rejects unrelated text", () => {
    expect(extractQrId("https://example.com/hello")).toBeNull();
    expect(extractQrId("")).toBeNull();
  });
});
