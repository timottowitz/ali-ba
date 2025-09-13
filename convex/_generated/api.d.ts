/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as disputes from "../disputes.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as logistics from "../logistics.js";
import type * as metrics from "../metrics.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as qa from "../qa.js";
import type * as rfqs from "../rfqs.js";
import type * as router from "../router.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as suppliers from "../suppliers.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  disputes: typeof disputes;
  documents: typeof documents;
  http: typeof http;
  logistics: typeof logistics;
  metrics: typeof metrics;
  orders: typeof orders;
  products: typeof products;
  qa: typeof qa;
  rfqs: typeof rfqs;
  router: typeof router;
  search: typeof search;
  seed: typeof seed;
  suppliers: typeof suppliers;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
