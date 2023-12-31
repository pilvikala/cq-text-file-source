import { default as Ajv } from "ajv";
import camelcaseKeys from "camelcase-keys";

const spec = {
  type: "object",
  properties: {
    concurrency: { type: "integer" },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    path: { type: "string" },
    csvDelimiter: { type: "string" },
  },
  required: ["path"],
};

type JSONSpec = {
  concurrency: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  path: string;
  csvDelimiter: string;
};

const ajv = new Ajv.default();
const validate = ajv.compile(spec);

export type Spec = {
  concurrency: number;
  path: string;
  csvDelimiter: string;
};

export const parseSpec = (spec: string): Spec => {
  const parsed = JSON.parse(spec) as Partial<JSONSpec>;
  const valid = validate(parsed);
  if (!valid) {
    throw new Error(`Invalid spec: ${JSON.stringify(validate.errors)}`);
  }
  const {
    concurrency = 10_000,
    path = "",
    csvDelimiter = ",",
  } = camelcaseKeys(parsed);
  return { concurrency, path, csvDelimiter };
};
