import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let clientSql: NeonQueryFunction<false, false> | null = null;
let lawyerSql: NeonQueryFunction<false, false> | null = null;

export function getClientDb() {
  const url = process.env.CLIENT_DATABASE_URL;
  if (!url) throw new Error("CLIENT_DATABASE_URL is not configured");
  if (!clientSql) clientSql = neon(url);
  return clientSql;
}

export function getLawyerDb() {
  const url = process.env.LAWYER_DATABASE_URL;
  if (!url) throw new Error("LAWYER_DATABASE_URL is not configured");
  if (!lawyerSql) lawyerSql = neon(url);
  return lawyerSql;
}
