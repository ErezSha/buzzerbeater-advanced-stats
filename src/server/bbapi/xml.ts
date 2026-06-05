import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  BbapiEndpointName,
  createBbapiResponseError,
  createXmlParseError,
} from "@/server/bbapi/errors";

export type XmlValue =
  | string
  | number
  | boolean
  | null
  | XmlRecord
  | XmlValue[];

export interface XmlRecord {
  [key: string]: XmlValue | undefined;
}

export interface BbapiXmlDocument extends XmlRecord {
  bbapi?: XmlRecord;
}

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

export function parseBbapiXml(
  xml: string,
  endpoint: BbapiEndpointName,
): BbapiXmlDocument {
  const validation = XMLValidator.validate(xml);

  if (validation !== true) {
    throw createXmlParseError(endpoint, validation);
  }

  try {
    const parsed = parser.parse(xml);
    return isXmlRecord(parsed) ? parsed : {};
  } catch (error) {
    throw createXmlParseError(endpoint, error);
  }
}

export function throwIfBbapiError(
  document: BbapiXmlDocument,
  endpoint: BbapiEndpointName,
): void {
  const message = readBbapiErrorMessage(document);

  if (message) {
    throw createBbapiResponseError(endpoint, message);
  }
}

export function readBbapiErrorMessage(
  document: BbapiXmlDocument,
): string | null {
  const bbapi = asRecord(document.bbapi);
  const error = firstRecord(bbapi?.error);
  const message = error?.message;

  return typeof message === "string" && message.length > 0 ? message : null;
}

function firstRecord(value: XmlValue | undefined): XmlRecord | null {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return asRecord(value);
}

function asRecord(value: XmlValue | undefined): XmlRecord | null {
  return isXmlRecord(value) ? value : null;
}

function isXmlRecord(value: unknown): value is XmlRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
