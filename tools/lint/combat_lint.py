#!/usr/bin/env python3
"""Combat System lint (ADR-0001, Decision D2 / migration step 2).

Two pragmatic, regex-based checks over src/gameplay/combat/*.gd:

(a) INT-DIVISION BAN: every bare `/` whose surrounding expression shows no
    explicit `float(` cast and no float literal is flagged, unless the line
    carries an intentional `#int-div-ok` marker. GDScript int/int truncates —
    the single largest defect class of the 4 review rounds.

(b) SIGNATURE SYMMETRY: every identifier used in a function body that is not
    a parameter, a local, a class member/constant/function, a known global
    class or a GDScript builtin is flagged (the `hp`/`exchange_id`
    missing-parameter class of round 4).

Usage: python tools/lint/combat_lint.py [paths...]   (default: src/gameplay/combat)
Exit code 0 = clean, 1 = findings.
"""
import re
import sys
from pathlib import Path

KEYWORDS = {
    "func", "var", "const", "static", "return", "if", "elif", "else", "for",
    "while", "in", "and", "or", "not", "true", "false", "null", "extends",
    "class_name", "class", "match", "break", "continue", "pass", "is", "as",
    "self", "void", "enum", "signal", "await", "breakpoint", "super",
}
BUILTINS = {
    # types
    "float", "int", "bool", "String", "Dictionary", "Array", "Variant",
    "PackedStringArray", "RandomNumberGenerator", "RefCounted", "Object",
    "SceneTree", "GutTest", "Callable", "OS",
    # functions
    "maxi", "maxf", "mini", "minf", "clampf", "clampi", "absf", "absi",
    "ceili", "ceilf", "floori", "floorf", "floor", "ceil", "round", "roundi",
    "range", "str", "print", "preload", "load", "push_error", "push_warning",
    "quit",  # SceneTree method, used by --script tools
}
IDENT = re.compile(r"[A-Za-z_]\w*")


def strip_strings_and_comments(line: str) -> str:
    out, i, quote = [], 0, None
    while i < len(line):
        ch = line[i]
        if quote:
            if ch == quote:
                quote = None
            out.append(" ")
        elif ch in "\"'":
            quote = ch
            out.append(" ")
        elif ch == "#":
            break
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def logical_lines(raw_lines):
    """Merge physical lines into logical ones (paren depth + backslash)."""
    buf, start, depth = "", 0, 0
    for idx, raw in enumerate(raw_lines):
        code = strip_strings_and_comments(raw.rstrip("\n"))
        if not buf:
            start = idx
        cont = code.rstrip().endswith("\\")
        buf += " " + (code.rstrip()[:-1] if cont else code)
        depth += code.count("(") - code.count(")")
        depth += code.count("[") - code.count("]")
        depth += code.count("{") - code.count("}")
        if depth <= 0 and not cont:
            yield start, buf.strip(), raw
            buf, depth = "", 0
    if buf:
        yield start, buf.strip(), ""


def check_division(path: Path, raw_lines, findings):
    # Names statically declared as float anywhere in the file (params, vars,
    # and float-returning funcs) — a `/` touching one of these is float math.
    text = "\n".join(strip_strings_and_comments(l) for l in raw_lines)
    float_names = set(re.findall(r"(\w+)\s*:\s*float", text))
    float_names |= set(re.findall(r"func\s+(\w+)\s*\([^)]*\)\s*->\s*float", text))
    for idx, raw in enumerate(raw_lines):
        code = strip_strings_and_comments(raw)
        if "/" not in code:
            continue
        if "#int-div-ok" in raw:
            continue
        for m in re.finditer(r"(?<!/)/(?!/|=)", code):
            window = code[max(0, m.start() - 60):m.start() + 60]
            if "float(" in window or re.search(r"\.\d|\d\.", window):
                continue
            operands = IDENT.findall(window)
            if any(name in float_names for name in operands):
                continue
            findings.append(f"{path}:{idx + 1}: bare `/` without float() cast "
                            f"or float operand (mark #int-div-ok if intended): "
                            f"{raw.strip()}")


def check_signature_symmetry(path: Path, raw_lines, class_members, findings):
    scope = None  # (params+locals set) for current function
    for start, code, _raw in logical_lines(raw_lines):
        indent = len(raw_lines[start]) - len(raw_lines[start].lstrip("\t "))
        fm = re.search(r"\bfunc\s+(\w+)?\s*\((.*)\)", code)
        if fm and code.lstrip().startswith(("func", "static func")):
            scope = set()
            for param in fm.group(2).split(","):
                name = param.split(":")[0].split("=")[0].strip()
                if name:
                    scope.add(name)
            continue
        if indent == 0 and code and not code.startswith(("\t", " ")):
            if not code.lstrip().startswith(("func", "static func")):
                scope = None  # back at class level
        if scope is None:
            continue
        # collect locals declared on this line (including lambda params)
        for vm in re.finditer(r"\bvar\s+(\w+)", code):
            scope.add(vm.group(1))
        for lm in re.finditer(r"\bfunc\s*\(([^)]*)\)", code):
            for param in lm.group(1).split(","):
                name = param.split(":")[0].split("=")[0].strip()
                if name:
                    scope.add(name)
        for fo in re.finditer(r"\bfor\s+(\w+)", code):
            scope.add(fo.group(1))
        # flag unknown identifiers
        for m in IDENT.finditer(code):
            name = m.group(0)
            prev = code[:m.start()].rstrip()[-1:] if m.start() else ""
            if prev == ".":
                continue  # attribute/method access
            if name in KEYWORDS or name in BUILTINS or name in class_members \
                    or name in scope:
                continue
            findings.append(f"{path}:{start + 1}: identifier `{name}` is not a "
                            f"parameter, local, class member, or known global")


def collect_class_members(paths):
    members = set()
    for path in paths:
        for raw in path.read_text(encoding="utf-8").splitlines():
            code = strip_strings_and_comments(raw)
            for pat in (r"^class_name\s+(\w+)", r"^(?:static\s+)?var\s+(\w+)",
                        r"^const\s+(\w+)", r"^(?:static\s+)?func\s+(\w+)"):
                m = re.match(pat, code)
                if m:
                    members.add(m.group(1))
    return members


def main() -> int:
    roots = [Path(p) for p in sys.argv[1:]] or [Path("src/gameplay/combat")]
    paths = sorted(p for root in roots
                   for p in (root.rglob("*.gd") if root.is_dir() else [root]))
    if not paths:
        print("combat_lint: no .gd files found", file=sys.stderr)
        return 1
    class_members = collect_class_members(paths)
    findings = []
    for path in paths:
        raw_lines = path.read_text(encoding="utf-8").splitlines()
        check_division(path, raw_lines, findings)
        check_signature_symmetry(path, raw_lines, class_members, findings)
    for finding in findings:
        print(finding)
    print(f"combat_lint: {len(paths)} files, {len(findings)} findings")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
