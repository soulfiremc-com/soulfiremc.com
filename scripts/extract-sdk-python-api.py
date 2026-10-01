"""Extract public Python SDK signatures from a pinned source checkout."""

import ast
import json
import sys
import textwrap
from pathlib import Path


def extract(source_dir: Path) -> dict[str, list[dict[str, str | int]]]:
    package = source_dir / "sdk" / "python" / "src" / "soulfire"
    exports = ast.parse((package / "__init__.py").read_text())
    exported_names = {
        item.asname or item.name
        for statement in exports.body if isinstance(statement, ast.ImportFrom)
        for item in statement.names
    }
    files = {
        path.name: [node.name for node in ast.parse(path.read_text()).body
                    if isinstance(node, ast.ClassDef) and node.name in exported_names]
        for path in sorted(package.glob("*.py"))
        if not path.name.endswith(("_pb2.py", "_connect.py"))
    }
    result = {}
    for filename, class_names in files.items():
        path = source_dir / "sdk" / "python" / "src" / "soulfire" / filename
        source = path.read_text()
        lines = source.splitlines()
        tree = ast.parse(source, filename=str(path))
        for cls in tree.body:
            if not isinstance(cls, ast.ClassDef) or cls.name not in class_names:
                continue
            methods = []
            for member in cls.body:
                if not isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                if member.name.startswith("_"):
                    continue
                body_line = member.body[0].lineno
                if body_line == member.lineno:
                    signature = lines[member.lineno - 1][:member.body[0].col_offset].strip()
                else:
                    signature = textwrap.dedent(
                        "\n".join(lines[member.lineno - 1 : body_line - 1])
                    ).rstrip()
                signature = signature.removesuffix(":")
                # @fn exposes an Effect while the implementation uses EffectGen.
                effect_decorator = "".join(
                    f"@{ast.get_source_segment(source, item)}\n"
                    for item in member.decorator_list
                    if isinstance(item, ast.Call) and isinstance(item.func, ast.Name) and item.func.id == "fn"
                )
                decorators = (
                    "".join(f"@{item.id}\n" for item in member.decorator_list if isinstance(item, ast.Name) and item.id in {"classmethod", "staticmethod", "property"})
                    if any(isinstance(item, ast.Name) and item.id in {"classmethod", "staticmethod", "property"} for item in member.decorator_list)
                    else ""
                )
                methods.append(
                    {
                        "name": member.name,
                        "signature": f"{decorators}{effect_decorator}{signature}",
                        "line": member.lineno,
                        "file": filename,
                        "description": ast.get_docstring(member) or "",
                    }
                )
            if methods:
                result[cls.name] = methods
    return result


if __name__ == "__main__":
    print(json.dumps(extract(Path(sys.argv[1]))))
