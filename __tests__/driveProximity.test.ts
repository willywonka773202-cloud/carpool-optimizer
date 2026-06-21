import { describe, expect, it } from "vitest";
import { driveStatus, proximityMessage, smsLink } from "../lib/driveProximity";

describe("driveProximity", () => {
  it("buckets distance into enroute / approaching / arrived (boundaries inclusive)", () => {
    expect(driveStatus(2000)).toBe("enroute");
    expect(driveStatus(801)).toBe("enroute");
    expect(driveStatus(800)).toBe("approaching");
    expect(driveStatus(151)).toBe("approaching");
    expect(driveStatus(150)).toBe("arrived");
    expect(driveStatus(0)).toBe("arrived");
  });

  it("picks a message per status and names the rider", () => {
    expect(proximityMessage("arrived", "Ava")).toContain("Ava");
    expect(proximityMessage("arrived", "Ava").toLowerCase()).toContain("come");
    expect(proximityMessage("approaching", null).toLowerCase()).toContain("5 min");
    expect(proximityMessage("enroute", "  ")).not.toContain(",");
  });

  it("builds a prefilled sms: link, with or without a number", () => {
    expect(smsLink("hi there", "+15551234567")).toBe("sms:+15551234567?&body=hi%20there");
    expect(smsLink("hi", null)).toBe("sms:?&body=hi");
  });
});
