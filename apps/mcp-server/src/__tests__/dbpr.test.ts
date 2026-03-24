import { describe, it, expect } from "vitest";
import { processDbprResults, matchProviderToLicense } from "../pipeline/dbpr";

describe("processDbprResults", () => {
  it('maps "Current,Active" to "active" and extracts CFC type', () => {
    const raw = {
      license_number: "CFC1234567",
      license_type: "Certified Plumbing Contractor",
      status: "Current,Active",
      expiry: "2027-03-15",
      name: "Cool Plumbing Co",
      disciplinary: [],
    };

    const result = processDbprResults(raw);

    expect(result.license_status).toBe("active");
    expect(result.license_type).toBe("CFC");
    expect(result.license_number).toBe("CFC1234567");
    expect(result.license_expiry).toBe("2027-03-15");
    expect(result.disciplinary_actions).toEqual([]);
  });

  it('maps "Current, Active" (with space) to "active"', () => {
    const raw = {
      license_number: "CFC9999999",
      license_type: "Certified Plumbing Contractor",
      status: "Current, Active",
      expiry: "2028-01-01",
      name: "Some Plumber",
      disciplinary: [],
    };

    const result = processDbprResults(raw);
    expect(result.license_status).toBe("active");
  });

  it('maps "Revoked" correctly with disciplinary actions', () => {
    const raw = {
      license_number: "EC0011111",
      license_type: "Certified Electrical Contractor",
      status: "Revoked",
      expiry: "2025-06-30",
      name: "Bad Electric Inc",
      disciplinary: [
        { date: "2024-01-15", action: "License revoked for fraud" },
      ],
    };

    const result = processDbprResults(raw);

    expect(result.license_status).toBe("revoked");
    expect(result.license_type).toBe("EC");
    expect(result.disciplinary_actions).toEqual([
      { date: "2024-01-15", action: "License revoked for fraud" },
    ]);
  });

  it('handles "Certified Air Conditioning" → "CAC"', () => {
    const raw = {
      license_number: "CAC1800000",
      license_type: "Certified Air Conditioning Contractor",
      status: "Current,Active",
      expiry: "2026-09-01",
      name: "CoolBreeze HVAC",
      disciplinary: [],
    };

    const result = processDbprResults(raw);
    expect(result.license_type).toBe("CAC");
  });

  it('handles "Certified Mechanical Contractor" → "CAC"', () => {
    const raw = {
      license_number: "CMC1234567",
      license_type: "Certified Mechanical Contractor",
      status: "Current,Active",
      expiry: "2026-09-01",
      name: "MechPro LLC",
      disciplinary: [],
    };

    const result = processDbprResults(raw);
    expect(result.license_type).toBe("CAC");
  });

  it('maps "Expired" status correctly', () => {
    const raw = {
      license_number: "CFC0000001",
      license_type: "Certified Plumbing Contractor",
      status: "Expired",
      expiry: "2023-01-01",
      name: "Old Pipes LLC",
      disciplinary: [],
    };

    const result = processDbprResults(raw);
    expect(result.license_status).toBe("expired");
  });

  it('maps "Null,Inactive" to "inactive"', () => {
    const raw = {
      license_number: "EC0022222",
      license_type: "Certified Electrical Contractor",
      status: "Null,Inactive",
      expiry: "",
      name: "Gone Electric",
      disciplinary: [],
    };

    const result = processDbprResults(raw);
    expect(result.license_status).toBe("inactive");
    expect(result.license_expiry).toBeNull();
  });

  it('maps unknown status to "pending"', () => {
    const raw = {
      license_number: "CFC5555555",
      license_type: "Certified Plumbing Contractor",
      status: "Under Review",
      expiry: "2027-06-01",
      name: "New Plumber",
      disciplinary: [],
    };

    const result = processDbprResults(raw);
    expect(result.license_status).toBe("pending");
  });

  it("returns unknown license_type for unrecognized type", () => {
    const raw = {
      license_number: "XX1234567",
      license_type: "Certified Underwater Basket Weaving",
      status: "Current,Active",
      expiry: "2027-01-01",
      name: "Basket Co",
      disciplinary: [],
    };

    const result = processDbprResults(raw);
    expect(result.license_type).toBe("OTHER");
  });
});

describe("matchProviderToLicense", () => {
  const providers = [
    { id: "p1", name: "Cool Plumbing Co", license_hint: "CFC1234567" },
    { id: "p2", name: "Miami HVAC Services LLC", license_hint: null },
    { id: "p3", name: "Spark Electrical Inc", license_hint: null },
  ];

  it("matches by exact license number", () => {
    const match = matchProviderToLicense(providers, "CFC1234567");
    expect(match).not.toBeNull();
    expect(match!.id).toBe("p1");
  });

  it("matches by fuzzy business name", () => {
    const match = matchProviderToLicense(
      providers,
      "UNKNOWN_LICENSE",
      "Miami HVAC Services",
    );
    expect(match).not.toBeNull();
    expect(match!.id).toBe("p2");
  });

  it("returns null for no match", () => {
    const match = matchProviderToLicense(
      providers,
      "UNKNOWN_LICENSE",
      "Completely Different Business Name XYZ",
    );
    expect(match).toBeNull();
  });

  it("prefers license number match over fuzzy name match", () => {
    const match = matchProviderToLicense(
      providers,
      "CFC1234567",
      "Spark Electrical Inc",
    );
    expect(match).not.toBeNull();
    expect(match!.id).toBe("p1");
  });

  it("returns null when no business name provided and no license match", () => {
    const match = matchProviderToLicense(providers, "NONEXISTENT");
    expect(match).toBeNull();
  });
});
