const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");

function prismaImportPath(fileDir) {
  const rel = path.relative(fileDir, path.join(ROOT, "lib", "prisma.ts"));
  return rel.split(path.sep).join("/");
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "scripts") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".ts") && !full.endsWith(path.join("lib", "prisma.ts"))) files.push(full);
  }
  return files;
}

for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;

  content = content.replace(/`nimport \{ prisma \}[^\n]*\n/g, "\n");
  content = content.replace(/import \{ prisma \} from \"[^\"]+\";\n/g, "");
  content = content.replace(
    /import \{ PrismaClient(?:, ([^}]+))? \} from \"@prisma\/client\";\s*\n\s*const prisma = new PrismaClient\(\);\s*\n/g,
    (_, rest) => (rest ? `import { ${rest} } from "@prisma/client";\n` : ""),
  );
  content = content.replace(/const prisma = new PrismaClient\(\);\s*\n/g, "");

  if (original.includes("new PrismaClient()") || original.includes("lib/prisma")) {
    if (!/from \"[^\"]*lib\/prisma\"/.test(content)) {
      const importLine = `import { prisma } from "${prismaImportPath(path.dirname(file))}";\n`;
      const idx = content.indexOf("\n");
      content = idx === -1 ? importLine + content : content.slice(0, idx + 1) + importLine + content.slice(idx + 1);
    }
    if (content !== original) {
      fs.writeFileSync(file, content.replace(/\r\n/g, "\n"));
      console.log("updated", path.relative(ROOT, file));
    }
  }
}
