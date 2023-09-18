import type { PathLike, Stats, Dirent } from "node:fs";
import { readFile, readdir, stat } from "node:fs";
import { basename, join } from "node:path";

import { Utf8 } from "@cloudquery/plugin-sdk-javascript/arrow";
import type {
  Column,
} from "@cloudquery/plugin-sdk-javascript/schema/column";
import { pathResolver } from "@cloudquery/plugin-sdk-javascript/schema/resolvers";
import type {
  Table,
  TableResolver,
} from "@cloudquery/plugin-sdk-javascript/schema/table";
import { createTable } from "@cloudquery/plugin-sdk-javascript/schema/table";
import { parse } from "csv-parse";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import localizedFormat from "dayjs/plugin/localizedFormat.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import pMap from "p-map";
import type { Logger } from "winston";

/* eslint-disable import/no-named-as-default-member */
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
type FsFunctionWithOptions = <T>(
  path: PathLike,
  options: unknown,
  callback: (error: NodeJS.ErrnoException | null, result: T) => void,
) => void;

type FsFunctionWithoutOptions = <T>(
  path: PathLike,
  callback: (error: NodeJS.ErrnoException | null, result: T) => void,
) => void;

const fsSync = async <T>(function_: FsFunctionWithOptions | FsFunctionWithoutOptions, path: PathLike, options?: unknown): Promise<T> => {
  return new Promise((resolve, reject) => {
    if(options) {
      (function_ as FsFunctionWithOptions)(path, options, (error: NodeJS.ErrnoException | null, result: T) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    } else {
      (function_ as FsFunctionWithoutOptions)(path, (error: NodeJS.ErrnoException | null, result: T) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    }
  });
};

const getFiles = async (logger: Logger, path: string): Promise<string[]> => {
  const stats = await fsSync<Stats>(stat, path);
  if (stats.isFile()) {
    return [path];
  }
  if (stats.isDirectory()) {
    const files = await fsSync<Dirent[]>(readdir, path, { withFileTypes: true });
    return files.filter((f) => f.isFile()).map((f) =>  join(path, f.name));
  }
  logger.error("Target path is neither a file or a directory.");
  return [];
};

const parseTable = async (
  content: Buffer,
  csvDelimiter: string,
): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    parse(content, { delimiter: csvDelimiter }, (error, records) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(records);
    });
  });
};

const getColumnResolver = (c: string) => {
  return pathResolver(c);
}

const getTableFromFile = async (
  logger: Logger,
  path: string,
  csvDelimiter: string,
): Promise<Table> => {
  const content = await fsSync<Buffer>(readFile, path);
  const rawTable = await parseTable(content, csvDelimiter);
  const name = basename(path);
  if (rawTable.length === 0) return createTable({ name, columns: [] });
  const columns: Column[] = rawTable[0].map((c) => ({
    name: c,
    type: new Utf8(),
    description: "",
    primaryKey: false,
    notNull: false,
    incrementalKey: false,
    unique: false,
    ignoreInTests: false,
    resolver: getColumnResolver(c),
  }));

  const columnNames = rawTable[0];
  const getRecordObjectFromRow = (row: string[]) => {
    const record: Record<string, string> = {};
    for(const [index, element] of row.entries()) {
      record[columnNames[index]] = element;
    }
    return record;
  }

  const resolver: TableResolver = (clientMeta, parent, stream) => {
    const records = rawTable.filter((_record, index) => index > 0);
    for (const record of records) {
      const recordAsObject = getRecordObjectFromRow(record);
      stream.write(recordAsObject);
    }
    return Promise.resolve();
  };
  return createTable({ name, columns, resolver });
};

export const getTables = async (
  logger: Logger,
  path: string,
  concurrency: number,
  csvDelimiter: string,
): Promise<Table[]> => {
  logger.info("discovering files");
  const files = await getFiles(logger, path);
  logger.info(`done discovering files. Found ${files.length} files`);

  const allTables = await pMap(
    files,
    async (fileName) => {
      logger.info(`reading ${fileName}`);
      return await getTableFromFile(logger, fileName, csvDelimiter);
    },
    {
      concurrency,
    },
  );
  return allTables;
};

