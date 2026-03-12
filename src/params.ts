import { z, type ZodTypeAny } from "zod";
import type { ParamDef, ParamType, ClassifiedParams } from "./types.js";

type ZodRawShape = Record<string, ZodTypeAny>;

/**
 * Converts an endpoint's param definitions into a Zod shape
 * suitable for passing to server.tool().
 */
export function buildZodShape(params: Record<string, ParamDef>): ZodRawShape {
  const shape: ZodRawShape = {};
  for (const [name, def] of Object.entries(params)) {
    shape[name] = buildZodType(name, def);
  }
  return shape;
}

function buildZodType(name: string, def: ParamDef): ZodTypeAny {
  const isRequired = def.required !== false && def.default === undefined;
  let schema: ZodTypeAny;

  // Enum takes priority over type
  if (def.enum && def.enum.length > 0) {
    const values = def.enum.map(String) as [string, ...string[]];
    schema = z.enum(values);
  } else {
    schema = buildBaseType(name, def.type, def.items);
  }

  if (def.description) {
    schema = schema.describe(def.description);
  }

  if (!isRequired) {
    if (def.default !== undefined) {
      schema = schema.optional().default(def.default as never);
    } else {
      schema = schema.optional();
    }
  }

  return schema;
}

function buildBaseType(
  _name: string,
  type: ParamType,
  items?: { type: ParamType }
): ZodTypeAny {
  switch (type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "integer":
      return z.number().int();
    case "boolean":
      return z.boolean();
    case "array": {
      const itemSchema = items ? buildBaseType("item", items.type) : z.unknown();
      return z.array(itemSchema);
    }
    case "object":
      return z.record(z.unknown());
    default:
      return z.unknown();
  }
}

/**
 * Splits a flat params map into four buckets by `in` location.
 */
export function classifyParams(params: Record<string, ParamDef>): ClassifiedParams {
  const result: ClassifiedParams = {
    pathParams: {},
    queryParams: {},
    bodyParams: {},
    headerParams: {},
  };

  for (const [name, def] of Object.entries(params)) {
    switch (def.in) {
      case "path":
        result.pathParams[name] = def;
        break;
      case "query":
        result.queryParams[name] = def;
        break;
      case "body":
        result.bodyParams[name] = def;
        break;
      case "header":
        result.headerParams[name] = def;
        break;
    }
  }

  return result;
}
