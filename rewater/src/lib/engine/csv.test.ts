import { describe, expect, it } from "vitest";
import { parseCsv, parseEnrollments, parseMeterReads, parseWeather, toCsv } from "./csv";
import { GALLONS_PER_CCF } from "./units";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and a BOM", () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n1,2');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["1", "2"],
    ]);
  });
});

describe("parseMeterReads", () => {
  it("accepts alias headers in any order", () => {
    const { rows, errors } = parseMeterReads("Read Date,Gallons,Account Number\n2025-01-03,120,A1\n2025-02,1,A1");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { accountId: "A1", period: "2025-01-03", gallons: 120 },
      { accountId: "A1", period: "2025-02", gallons: 1 },
    ]);
  });

  it("converts CCF to gallons and US-style dates to months", () => {
    const { rows, errors } = parseMeterReads("account_id,date,ccf\nA,3/15/2025,2");
    expect(errors).toEqual([]);
    expect(rows[0].period).toBe("2025-03");
    expect(rows[0].gallons).toBeCloseTo(2 * GALLONS_PER_CCF);
  });

  it("reports missing columns and bad rows by line number", () => {
    expect(parseMeterReads("foo,bar\n1,2").errors.length).toBe(3);
    const { rows, errors } = parseMeterReads("account_id,date,gallons\nA,notadate,5\nB,2025-01,-3\nC,2025-01,7");
    expect(rows.length).toBe(1);
    expect(errors).toEqual(['Row 2: "notadate" is not a date.', "Row 3: usage is not a non-negative number."]);
  });
});

describe("parseEnrollments", () => {
  it("maps intervention names and defaults unknown ones to other", () => {
    const { rows, errors } = parseEnrollments(
      "account_id,install_date,measure\nA,2025-04-02,Smart Controller\nB,2025-05-01,Cash for Grass\nC,2025-05-01,rain barrel",
    );
    expect(errors).toEqual([]);
    expect(rows.map((r) => r.intervention)).toEqual(["smart_controller", "turf_replacement", "other"]);
  });
});

describe("parseWeather", () => {
  it("reads CIMIS-style column names", () => {
    const { rows, errors } = parseWeather("Month,Total ETo (in),Total Precip (in)\n2025-07,8.1,0");
    expect(errors).toEqual([]);
    expect(rows).toEqual([{ month: "2025-07", et0In: 8.1, rainIn: 0 }]);
  });
});

describe("toCsv", () => {
  it("round-trips through parseCsv", () => {
    const text = toCsv(["a", "b"], [["x,y", 3], ['q"', null]]);
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["x,y", "3"],
      ['q"', ""],
    ]);
  });
});
