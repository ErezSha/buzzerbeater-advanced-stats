import type { XmlRecord, XmlValue } from "@/server/bbapi/xml";

export function childRecord(
  record: XmlRecord | null | undefined,
  key: string,
): XmlRecord | null {
  return asRecord(record?.[key]);
}

export function childRecords(
  record: XmlRecord | null | undefined,
  key: string,
): XmlRecord[] {
  const value = record?.[key];

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const child = asRecord(item);
      return child ? [child] : [];
    });
  }

  const child = asRecord(value);
  return child ? [child] : [];
}

export function childValues(
  record: XmlRecord | null | undefined,
  key: string,
): XmlValue[] {
  const value = record?.[key];

  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined ? [] : [value];
}

export function asRecord(value: XmlValue | undefined): XmlRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : null;
}

export function readString(
  record: XmlRecord | null | undefined,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record?.[key];

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return null;
}

export function readNumber(
  record: XmlRecord | null | undefined,
  ...keys: string[]
): number | null {
  const value = readString(record, ...keys);

  if (value === null) {
    return null;
  }

  const normalized = value.replace(/[%,$\s]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function readScoreValue(record: XmlRecord | null | undefined): number | null {
  return readNumber(record, "#text", "value", "score");
}

export function readXmlNumber(value: XmlValue | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[%,$\s]/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  return readScoreValue(asRecord(value));
}

export function requireString(
  record: XmlRecord | null | undefined,
  fallback: string,
  ...keys: string[]
): string {
  return readString(record, ...keys) ?? fallback;
}
