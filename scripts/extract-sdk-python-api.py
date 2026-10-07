"""Extract Python SDK contracts without importing or executing the package."""

import ast
import json
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Module:
    path: Path
    name: str
    tree: ast.Module
    bindings: dict[str, str]


class Extractor:
    def __init__(self, source_dir: Path):
        self.directory = source_dir
        self.package = source_dir / "sdk/python/src/soulfire"
        self.modules: dict[str, Module] = {}
        for path in sorted(self.package.rglob("*.py")):
            if path.name == "__init__.py":
                continue
            stub = path.with_suffix(".pyi")
            selected = stub if stub.exists() else path
            name = ".".join(path.relative_to(self.package).with_suffix("").parts)
            tree = ast.parse(selected.read_text(), filename=str(selected))
            self.modules[name] = Module(selected, name, tree, {})
        for module in self.modules.values():
            module.bindings = self.imports(module.tree, module.name)
        self.root = ast.parse((self.package / "__init__.py").read_text())
        self.root_imports = self.imports(self.root, "__init__")
        self.public = self.exports(self.root)
        self.nodes: dict[str, tuple[Module, ast.AST]] = {}

        def record(module: Module, body: list[ast.stmt], parent: str = ""):
            for node in body:
                if parent and not isinstance(node, ast.ClassDef):
                    continue
                for name in self.names(node):
                    qualified = f"{parent}.{name}" if parent else name
                    self.nodes[f"{module.name}:{qualified}"] = (module, node)
                    if isinstance(node, ast.ClassDef):
                        record(module, node.body, qualified)

        for module in self.modules.values():
            record(module, module.tree.body)

    @staticmethod
    def exports(tree: ast.Module) -> list[str] | None:
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(
                isinstance(target, ast.Name) and target.id == "__all__"
                for target in node.targets
            ):
                return ast.literal_eval(node.value)
        return None

    @staticmethod
    def names(node: ast.AST) -> list[str]:
        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            return [node.name]
        if isinstance(node, ast.TypeAlias):
            return [node.name.id]
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            return [node.target.id]
        if isinstance(node, ast.Assign):
            return [
                target.id for target in node.targets if isinstance(target, ast.Name)
            ]
        return []

    def imports(self, tree: ast.Module, name: str) -> dict[str, str]:
        result = {}
        for node in tree.body:
            if isinstance(node, ast.ImportFrom):
                parts = name.split(".")[: -node.level] if node.level else []
                module = ".".join([*parts, node.module or ""])
                for item in node.names:
                    local_module = module.removeprefix("soulfire.")
                    if module in {"", "soulfire"} and item.name in self.modules:
                        result[item.asname or item.name] = f"{item.name}:"
                    else:
                        result[item.asname or item.name] = f"{local_module}:{item.name}"
            elif isinstance(node, ast.Import):
                for item in node.names:
                    result[item.asname or item.name] = f"{item.name}:"
        return result

    def resolve(self, identifier: str, trail: frozenset[str] = frozenset()) -> str:
        if identifier in trail:
            return identifier
        module_name, _, name = identifier.partition(":")
        module = self.modules.get(module_name)
        if module and name in module.bindings:
            return self.resolve(module.bindings[name], trail | {identifier})
        return identifier

    def source(self, module: Module, node: ast.AST) -> dict:
        return {
            "file": str(module.path.relative_to(self.directory)),
            "line": node.lineno,
        }

    @staticmethod
    def text(node: ast.AST | None) -> str:
        return ast.unparse(node) if node is not None else "Unannotated"

    @staticmethod
    def generic(node: ast.AST) -> str:
        params = getattr(node, "type_params", [])
        return f"[{', '.join(ast.unparse(item) for item in params)}]" if params else ""

    @staticmethod
    def decorator_name(node: ast.AST) -> str:
        if isinstance(node, ast.Call):
            return Extractor.decorator_name(node.func)
        return (
            node.id
            if isinstance(node, ast.Name)
            else node.attr
            if isinstance(node, ast.Attribute)
            else ""
        )

    def signature(
        self, node: ast.FunctionDef | ast.AsyncFunctionDef, name: str | None = None
    ) -> dict:
        effect = any(self.decorator_name(item) == "fn" for item in node.decorator_list)
        returns = self.text(node.returns)
        if effect and returns.startswith("EffectGen["):
            returns = "Effect[" + returns[len("EffectGen[") :]
        parameters = []
        positional = [*node.args.posonlyargs, *node.args.args]
        defaults = [None] * (len(positional) - len(node.args.defaults)) + list(
            node.args.defaults
        )
        for index, (arg, default) in enumerate(zip(positional, defaults)):
            if arg.arg in {"self", "cls"}:
                continue
            parameters.append(
                {
                    "name": arg.arg,
                    "type": self.text(arg.annotation),
                    "optional": default is not None,
                    "kind": "positional only"
                    if index < len(node.args.posonlyargs)
                    else "positional or keyword",
                    **({"default": self.text(default)} if default is not None else {}),
                }
            )
        if node.args.vararg:
            parameters.append(
                {
                    "name": f"*{node.args.vararg.arg}",
                    "type": self.text(node.args.vararg.annotation),
                    "optional": True,
                    "kind": "variadic positional",
                }
            )
        for arg, default in zip(node.args.kwonlyargs, node.args.kw_defaults):
            parameters.append(
                {
                    "name": arg.arg,
                    "type": self.text(arg.annotation),
                    "optional": default is not None,
                    "kind": "keyword only",
                    **({"default": self.text(default)} if default is not None else {}),
                }
            )
        if node.args.kwarg:
            parameters.append(
                {
                    "name": f"**{node.args.kwarg.arg}",
                    "type": self.text(node.args.kwarg.annotation),
                    "optional": True,
                    "kind": "variadic keyword",
                }
            )
        prefix = "async " if isinstance(node, ast.AsyncFunctionDef) else ""
        decorators = [
            f"@{self.text(item)}"
            for item in node.decorator_list
            if self.decorator_name(item)
            in {"staticmethod", "classmethod", "property", "overload"}
        ]
        header = f"{prefix}def {name or node.name}{self.generic(node)}({ast.unparse(node.args)})"
        if node.returns is not None:
            header += f" -> {returns}"
        return {
            "text": "\n".join([*decorators, header]),
            "parameters": parameters,
            "returns": returns,
            "effect": effect,
        }

    def field(
        self, module: Module, node: ast.AnnAssign, name: str, total: bool = True
    ) -> dict:
        annotation = self.text(node.annotation)
        optional = not total
        if annotation.startswith("NotRequired["):
            optional = True
        elif annotation.startswith("Required["):
            optional = False
        default = {"default": self.text(node.value)} if node.value is not None else {}
        if (
            isinstance(node.value, ast.Call)
            and self.decorator_name(node.value.func) == "field"
        ):
            options = {keyword.arg: keyword.value for keyword in node.value.keywords}
            default = {}
            if "default" in options:
                default["default"] = self.text(options["default"])
            if "default_factory" in options:
                default["defaultFactory"] = self.text(options["default_factory"])
            if "init" in options:
                default["constructorParameter"] = ast.literal_eval(options["init"])
        return {
            "name": name,
            "kind": "property",
            "description": "",
            "source": self.source(module, node),
            "signatures": [],
            "type": annotation,
            "optional": optional,
            **default,
        }

    def call_type(self, module: Module, owner: ast.ClassDef, call: ast.Call) -> str:
        function = self.text(call.func)
        if function in {
            "tuple",
            "list",
            "dict",
            "set",
            "str",
            "int",
            "float",
            "bool",
            "bytes",
        }:
            return function
        identifier = self.resolve(
            module.bindings.get(function, f"{module.name}:{function}")
        )
        definition = self.nodes.get(identifier)
        node = definition[1] if definition else None
        if isinstance(node, ast.ClassDef):
            return function
        if (
            isinstance(call.func, ast.Attribute)
            and isinstance(call.func.value, ast.Name)
            and call.func.value.id == "self"
        ):
            node = next(
                (
                    item
                    for item in owner.body
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and item.name == call.func.attr
                ),
                None,
            )
        if (
            not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            or node.returns is None
        ):
            return "Unannotated"
        type_parameters = {parameter.name for parameter in node.type_params}
        if isinstance(node.returns, ast.Name) and node.returns.id in type_parameters:
            arguments = [
                arg
                for arg in [*node.args.posonlyargs, *node.args.args]
                if arg.arg not in {"self", "cls"}
            ]
            for parameter, value in zip(arguments, call.args):
                annotation = parameter.annotation
                if not isinstance(annotation, ast.Subscript):
                    continue
                factory = self.text(annotation.value)
                result = (
                    annotation.slice.elts[-1]
                    if isinstance(annotation.slice, ast.Tuple)
                    else annotation.slice
                )
                if (
                    factory not in {"Callable", "type"}
                    or not isinstance(result, ast.Name)
                    or result.id != node.returns.id
                ):
                    continue
                actual = self.text(value)
                actual_identifier = self.resolve(
                    module.bindings.get(actual, f"{module.name}:{actual}")
                )
                actual_definition = self.nodes.get(actual_identifier)
                if actual_definition and isinstance(actual_definition[1], ast.ClassDef):
                    return actual
            return "Unannotated"
        return self.text(node.returns)

    def class_members(
        self, module: Module, node: ast.ClassDef, trail: frozenset[str]
    ) -> list[dict]:
        members: dict[str, dict] = {}
        for base in node.bases:
            base_name = self.text(base).split("[")[0]
            identifier = self.resolve(
                module.bindings.get(base_name, f"{module.name}:{base_name}")
            )
            if identifier in self.nodes and identifier not in trail:
                base_module, base_node = self.nodes[identifier]
                if isinstance(base_node, ast.ClassDef):
                    for member in self.class_members(
                        base_module, base_node, trail | {identifier}
                    ):
                        if member["name"] != "__init__":
                            members[member["name"]] = {
                                **member,
                                "inheritedFrom": base_name,
                            }
        total = not any(
            keyword.arg == "total"
            and isinstance(keyword.value, ast.Constant)
            and keyword.value.value is False
            for keyword in node.keywords
        )
        typed_dict = any(
            self.text(base).split("[")[0] == "TypedDict" for base in node.bases
        )
        overloads = {}
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if item.name.startswith("_") and item.name not in {
                    "__init__",
                    "__call__",
                    "__iter__",
                    "__aiter__",
                    "__enter__",
                    "__exit__",
                    "__aenter__",
                    "__aexit__",
                }:
                    continue
                signature = self.signature(item)
                if any(
                    self.decorator_name(decorator) == "overload"
                    for decorator in item.decorator_list
                ):
                    overloads.setdefault(item.name, []).append(signature)
                members[item.name] = {
                    "name": item.name,
                    "kind": "constructor"
                    if item.name == "__init__"
                    else "property"
                    if any(
                        self.decorator_name(decorator) == "property"
                        for decorator in item.decorator_list
                    )
                    else "method",
                    "description": ast.get_docstring(item) or "",
                    "source": self.source(module, item),
                    "signatures": overloads.get(item.name, [signature]),
                }
                if item.name == "__init__":
                    annotated_args = {
                        arg.arg: arg.annotation
                        for arg in [
                            *item.args.posonlyargs,
                            *item.args.args,
                            *item.args.kwonlyargs,
                        ]
                    }
                    for assignment in ast.walk(item):
                        targets = (
                            assignment.targets
                            if isinstance(assignment, ast.Assign)
                            else [assignment.target]
                            if isinstance(assignment, ast.AnnAssign)
                            else []
                        )
                        for target in targets:
                            if (
                                not isinstance(target, ast.Attribute)
                                or not isinstance(target.value, ast.Name)
                                or target.value.id != "self"
                                or target.attr.startswith("_")
                            ):
                                continue
                            annotation = (
                                assignment.annotation
                                if isinstance(assignment, ast.AnnAssign)
                                else annotated_args.get(assignment.value.id)
                                if isinstance(assignment.value, ast.Name)
                                else None
                            )
                            value_type = self.text(annotation)
                            if annotation is None and isinstance(
                                assignment.value, ast.Constant
                            ):
                                value_type = type(assignment.value.value).__name__
                            elif annotation is None and isinstance(
                                assignment.value, ast.Call
                            ):
                                value_type = self.call_type(
                                    module, node, assignment.value
                                )
                            if value_type == "Unannotated" and target.attr in members:
                                value_type = members[target.attr].get(
                                    "type", value_type
                                )
                            members[target.attr] = {
                                "name": target.attr,
                                "kind": "property",
                                "description": "",
                                "source": self.source(module, assignment),
                                "signatures": [],
                                "type": value_type,
                            }
            elif (
                isinstance(item, ast.AnnAssign)
                and isinstance(item.target, ast.Name)
                and not item.target.id.startswith("_")
            ):
                members[item.target.id] = self.field(
                    module, item, item.target.id, total if typed_dict else True
                )
            elif isinstance(item, ast.Assign):
                for name in self.names(item):
                    if not name.startswith("_"):
                        members[name] = {
                            "name": name,
                            "kind": "constant",
                            "description": "",
                            "source": self.source(module, item),
                            "signatures": [],
                            "default": self.text(item.value),
                        }
        dataclass_decorator = next(
            (
                item
                for item in node.decorator_list
                if self.decorator_name(item) == "dataclass"
            ),
            None,
        )
        if dataclass_decorator is not None and "__init__" not in members:
            keyword_only = isinstance(dataclass_decorator, ast.Call) and any(
                keyword.arg == "kw_only"
                and isinstance(keyword.value, ast.Constant)
                and keyword.value.value
                for keyword in dataclass_decorator.keywords
            )
            parameters = []
            for member in members.values():
                if (
                    member["kind"] != "property"
                    or member.get("constructorParameter") is False
                    or member.get("signatures")
                    or member.get("type", "").startswith("ClassVar[")
                ):
                    continue
                parameters.append(
                    {
                        "name": member["name"],
                        "type": member.get("type", "Unannotated"),
                        "optional": "default" in member or "defaultFactory" in member,
                        "kind": "keyword only"
                        if keyword_only
                        else "positional or keyword",
                        **(
                            {"default": member["default"]}
                            if "default" in member
                            else {}
                        ),
                        **(
                            {"defaultFactory": member["defaultFactory"]}
                            if "defaultFactory" in member
                            else {}
                        ),
                    }
                )
            args = ", ".join(
                f"{parameter['name']}: {parameter['type']}"
                + (
                    f" = {parameter['default']}"
                    if "default" in parameter
                    else " = ..."
                    if "defaultFactory" in parameter
                    else ""
                )
                for parameter in parameters
            )
            members = {
                "__init__": {
                    "name": "__init__",
                    "kind": "constructor",
                    "description": "Constructor generated by `@dataclass`.",
                    "source": self.source(module, node),
                    "signatures": [
                        {
                            "text": f"{node.name}({'*, ' if keyword_only else ''}{args})",
                            "parameters": parameters,
                            "returns": node.name,
                        }
                    ],
                },
                **members,
            }
        return list(members.values())

    def extract_symbol(self, identifier: str, name: str, imports: list[str]) -> dict:
        module, node = self.nodes[identifier]
        signatures = []
        members = []
        bases = []
        value_type = None
        if isinstance(node, ast.ClassDef):
            bases = [self.text(base) for base in node.bases]
            kind = (
                "enum"
                if any("Enum" in base for base in bases)
                or any(
                    keyword.arg == "metaclass"
                    and "EnumTypeWrapper" in self.text(keyword.value)
                    for keyword in node.keywords
                )
                else "data model"
                if any(
                    self.decorator_name(item) == "dataclass"
                    for item in node.decorator_list
                )
                or "TypedDict" in bases
                else "class"
            )
            keywords = [
                f"{keyword.arg}={self.text(keyword.value)}" for keyword in node.keywords
            ]
            base_text = (
                f"({', '.join([*bases, *keywords])})" if bases or keywords else ""
            )
            decorators = [
                f"@{self.text(item)}"
                for item in node.decorator_list
                if self.decorator_name(item) == "dataclass"
            ]
            signatures = [
                {
                    "text": "\n".join(
                        [*decorators, f"class {name}{self.generic(node)}{base_text}"]
                    ),
                    "parameters": [],
                }
            ]
            members = self.class_members(module, node, frozenset({identifier}))
            description = ast.get_docstring(node) or ""
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            kind = "function"
            definitions = [
                item
                for item in module.tree.body
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
                and item.name == node.name
            ]
            overloads = [
                item
                for item in definitions
                if any(
                    self.decorator_name(decorator) == "overload"
                    for decorator in item.decorator_list
                )
            ]
            signatures = [self.signature(item, name) for item in overloads or [node]]
            description = ast.get_docstring(node) or ""
        elif isinstance(node, ast.TypeAlias):
            kind = "type"
            signatures = [
                {
                    "text": f"type {name}{self.generic(node)} = {self.text(node.value)}",
                    "parameters": [],
                }
            ]
            description = ""
        else:
            kind = "constant"
            value_type = (
                self.text(node.annotation) if isinstance(node, ast.AnnAssign) else None
            )
            value = node.value
            signatures = [
                {
                    "text": name
                    + (f": {value_type}" if value_type else "")
                    + (f" = {self.text(value)}" if value is not None else ""),
                    "parameters": [],
                }
            ]
            description = ""
        # Resolve names in inherited signatures using their defining modules as well.
        bindings = {key: self.resolve(value) for key, value in module.bindings.items()}
        bindings.update(
            {
                key.split(":", 1)[1]: key
                for key in self.nodes
                if key.startswith(f"{module.name}:")
            }
        )
        if isinstance(node, ast.ClassDef):
            bindings[node.name] = identifier
        for member in members:
            member_module = next(
                (
                    item
                    for item in self.modules.values()
                    if str(item.path.relative_to(self.directory))
                    == member["source"]["file"]
                ),
                module,
            )
            for key, value in member_module.bindings.items():
                bindings.setdefault(key, self.resolve(value))
        return {
            "id": identifier,
            "name": name,
            "kind": kind,
            "module": module.name,
            "imports": imports,
            "description": description,
            "source": self.source(module, node),
            "signatures": signatures,
            "members": members,
            "bases": bases,
            "examples": [],
            "bindings": bindings,
            **({"type": value_type} if value_type else {}),
        }

    def extract(self) -> dict:
        root_names = (
            self.public
            if self.public is not None
            else [name for name in self.root_imports if not name.startswith("_")]
        )
        root_exports = {
            self.resolve(self.root_imports[name]): name
            for name in root_names
            if name in self.root_imports
        }
        symbols = []
        for identifier, (module, node) in sorted(self.nodes.items()):
            name = root_exports.get(identifier, identifier.split(":", 1)[1])
            original = identifier.split(":", 1)[1]
            if original.startswith("_") and identifier not in root_exports:
                continue
            if module.name.startswith("_") and identifier not in root_exports:
                continue
            if (
                isinstance(node, ast.Assign)
                and isinstance(node.value, ast.Call)
                and self.decorator_name(node.value.func)
                in {"TypeVar", "ParamSpec", "TypeVarTuple"}
            ):
                continue
            imports = ["soulfire"] if identifier in root_exports else []
            if not module.name.startswith("_"):
                imports.append(f"soulfire.{module.name}")
            symbols.append(self.extract_symbol(identifier, name, imports))
        return {"language": "python", "symbols": symbols}


def extract(source_dir: Path) -> dict:
    return Extractor(source_dir).extract()


if __name__ == "__main__":
    print(json.dumps(extract(Path(sys.argv[1]))))
