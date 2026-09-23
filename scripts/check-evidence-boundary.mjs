import fs from "node:fs";
import path from "node:path";

const roots = ["src", "dist"].filter(fs.existsSync);
const forbidden = [
  { name: "protected signed-URL minting", re: /createSignedUrl\s*\(/g },
  { name: "signed object URL path", re: /\/storage\/v1\/object\/sign\//g },
  { name: "service-role environment name in browser code", re: /SUPABASE_SERVICE_ROLE_KEY/g },
  { name: "Supabase secret key in browser code", re: /sb_secret_[A-Za-z0-9_-]+/g },
  { name: "service_role JWT claim in browser code", re: /"role"\s*:\s*"service_role"/g }
];

const allowedExt = new Set([".js",".jsx",".ts",".tsx",".mjs",".cjs",".html"]);
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(allowedExt.has(path.extname(entry.name))) {
      const text=fs.readFileSync(full,"utf8");
      for(const rule of forbidden) {
        rule.re.lastIndex=0;
        if(rule.re.test(text)) failures.push(`${full}: ${rule.name}`);
      }
    }
  }
}

for(const root of roots) walk(root);

if(failures.length) {
  console.error("Evidence boundary check failed:\n"+failures.join("\n"));
  process.exit(1);
}
console.log("Evidence boundary check passed.");
