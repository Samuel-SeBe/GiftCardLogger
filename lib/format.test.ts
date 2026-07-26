import { describe, it, expect } from "vitest";
import { stripSpaces, groupFour, groupCardNumber } from "@/lib/format";

describe("stripSpaces", () => {
  it("removes internal and edge whitespace", () => {
    expect(stripSpaces("6050 1234 5678 9012")).toBe("6050123456789012");
    expect(stripSpaces("  1234  ")).toBe("1234");
  });

  it("removes non-breaking and other unicode whitespace", () => {
    expect(stripSpaces("12 34")).toBe("1234");
    expect(stripSpaces("12\t34\n56")).toBe("123456");
  });

  it("preserves dashes in claim codes", () => {
    expect(stripSpaces("Q4X7-KPLMN9-8T2W")).toBe("Q4X7-KPLMN9-8T2W");
    expect(stripSpaces("ABCD-1234 5678")).toBe("ABCD-12345678");
  });

  it("handles empty strings", () => {
    expect(stripSpaces("")).toBe("");
    expect(stripSpaces("   ")).toBe("");
  });
});

describe("groupFour", () => {
  it("inserts a space every four characters", () => {
    expect(groupFour("4941601794804285")).toBe("4941 6017 9480 4285");
  });

  it("keeps a trailing partial group", () => {
    expect(groupFour("58635936400011741424568")).toBe(
      "5863 5936 4000 1174 1424 568"
    );
  });

  it("leaves short values unchanged", () => {
    expect(groupFour("1234")).toBe("1234");
    expect(groupFour("12")).toBe("12");
  });
});

describe("groupCardNumber", () => {
  it("groups a spaceless numeric card number", () => {
    expect(groupCardNumber("58635936400011741424568")).toBe(
      "5863 5936 4000 1174 1424 568"
    );
  });

  it("groups a spaceless alphanumeric code", () => {
    expect(groupCardNumber("Q4X7KPLMN98T2W")).toBe("Q4X7 KPLM N98T 2W");
  });

  it("leaves already-spaced numbers untouched", () => {
    expect(groupCardNumber("4941 6017 9480 4285")).toBe("4941 6017 9480 4285");
  });

  it("leaves dashed claim codes untouched", () => {
    expect(groupCardNumber("Q4X7-KPLMN9-8T2W")).toBe("Q4X7-KPLMN9-8T2W");
  });

  it("leaves short values untouched", () => {
    expect(groupCardNumber("1234")).toBe("1234");
  });
});
