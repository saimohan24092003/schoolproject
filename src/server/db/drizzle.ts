import dns from "node:dns";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/server/db/schema";

// Patch dns.lookup to use public DNS (8.8.8.8) for neon.tech hostnames.
// Node's native fetch uses getaddrinfo which ignores dns.setServers(),
// so we must patch dns.lookup directly to fix ISP/local DNS blocking.
const originalLookup = dns.lookup.bind(dns);
(dns as any).lookup = function (
  hostname: string,
  options: any,
  callback: any
) {
  if (hostname && hostname.includes("neon.tech")) {
    const resolver = new dns.Resolver();
    resolver.setServers(["8.8.8.8", "8.8.4.4"]);
    const opts =
      typeof options === "object" && options !== null ? options : {};
    const returnAll = opts.all === true;
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || !addresses.length) {
        return originalLookup(hostname, options, callback);
      }
      const cb = typeof options === "function" ? options : callback;
      if (returnAll) {
        cb(null, addresses.map((a: string) => ({ address: a, family: 4 })));
      } else {
        cb(null, addresses[0], 4);
      }
    });
  } else {
    originalLookup(hostname, options, callback);
  }
};

const connector = neon(process.env.DATABASE_URL as string);
const db = drizzle(connector, { schema });

export default db;
