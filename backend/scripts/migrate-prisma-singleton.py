import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..", "src")

REPLACEMENTS = [
    (
        re.compile(r"import \{ PrismaClient \} from \"@prisma/client\";\s*\n\s*const prisma = new PrismaClient\(\);\s*\n"),
        "",
    ),
    (
        re.compile(r"import \{ PrismaClient, ([^}]+) \} from \"@prisma/client\";\s*\n\s*const prisma = new PrismaClient\(\);\s*\n"),
        r'import { \1 } from "@prisma/client";\n',
    ),
]


def prisma_import_path(file_dir: str) -> str:
    rel = os.path.relpath(os.path.join(ROOT, "lib", "prisma.ts"), file_dir)
    return rel.replace("\\", "/")


for dirpath, dirnames, filenames in os.walk(ROOT):
    if os.path.basename(dirpath) == "scripts" or "scripts" in dirpath.split(os.sep):
        continue
    for name in filenames:
        if not name.endswith(".ts"):
            continue
        if name == "prisma.ts" and dirpath.endswith("lib"):
            continue
        path = os.path.join(dirpath, name)
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()

        if "new PrismaClient()" not in content and "lib/prisma" not in content:
            continue

        original = content
        for pattern, repl in REPLACEMENTS:
            content = pattern.sub(repl, content)

        content = re.sub(r"const prisma = new PrismaClient\(\);\s*\n", "", content)
        content = content.replace("`nimport { prisma }", "\nimport { prisma }")
        content = re.sub(r"import \{ prisma \} from \"[^\"]+\";\n", "", content)

        if "from \"../lib/prisma\"" not in content and "from \"./lib/prisma\"" not in content:
            if not re.search(r"from \"[^\"]*lib/prisma\"", content):
                import_line = f'import {{ prisma }} from "{prisma_import_path(dirpath)}";\n'
                if content.startswith("import "):
                    first_break = content.find("\n") + 1
                    content = content[:first_break] + import_line + content[first_break:]
                else:
                    content = import_line + content

        if content != original:
            with open(path, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(content)
            print("updated", os.path.relpath(path, ROOT))
