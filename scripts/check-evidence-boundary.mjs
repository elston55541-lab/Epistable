import fs from "node:fs";
import path from "node:path";

const protectedRoots = [
  "src/lib/marketplace.js",
  "src/marketplace",
  "src/MarketplaceApp.jsx",
].filter(fs.existsSync);

const bundleRoots = ["src", "dist"].filter(fs.existsSync);
const allowedExt = new Set([".js",".jsx",".ts",".tsx",".mjs",".cjs",".html"]);
const failures = [];

const protectedRules = [
  { name: "protected signed-URL minting", re: /createSignedUrl\s*\(/g },
  { name: "protected signed object URL path", re: /\/storage\/v1\/object\/sign\//g },
  { name: "direct protected Storage download", re: /storage\.from\(['"]trade-evidence['"]\)\.download\s*\(/g },
  { name: "external protected evidence fallback", re: /(?:record|document)\.file_url/g },
];

const secretRules = [
  { name: "service-role environment name in browser code", re: /SUPABASE_SERVICE_ROLE_KEY/g },
  { name: "Supabase secret key in browser code", re: /sb_secret_[A-Za-z0-9_-]+/g },
  { name: "service_role JWT claim in browser code", re: /["']role["']\s*:\s*["']service_role["']/g },
];

function scanFile(full, rules) {
  if(!allowedExt.has(path.extname(full))) return;
  const source=fs.readFileSync(full,"utf8");
  for(const rule of rules) {
    rule.re.lastIndex=0;
    if(rule.re.test(source)) failures.push(`${full}: ${rule.name}`);
  }
}

function walk(entry, rules) {
  const stat=fs.statSync(entry);
  if(stat.isDirectory()) {
    for(const child of fs.readdirSync(entry)) walk(path.join(entry,child),rules);
  } else scanFile(entry,rules);
}

for(const root of protectedRoots) walk(root,protectedRules);
for(const root of bundleRoots) walk(root,secretRules);

if(failures.length) {
  console.error("Evidence boundary check failed:\n"+[...new Set(failures)].join("\n"));
  process.exit(1);
}
console.log("Evidence boundary check passed.");
