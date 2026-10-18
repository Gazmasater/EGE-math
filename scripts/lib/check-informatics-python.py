"""Execute reviewed, bounded teaching programs against independent input/output cases."""
import ast
import contextlib
import io
import json
import math
import re
import sys


def compile_program(source):
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            assert all(n.name == 'sys' and n.asname is None for n in node.names)
        if isinstance(node, ast.ImportFrom):
            assert node.module == 'operator' and node.level == 0
            assert all(n.name == 'truediv' and n.asname is None for n in node.names)
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                assert node.func.id in {'iter', 'map', 'int', 'next', 'range', 'abs', 'print', 'format', 'divmod', 'truediv', 'min', 'max'}
            else:
                assert isinstance(node.func, ast.Attribute) and node.func.attr in {'read', 'split'}
        if isinstance(node, ast.Attribute):
            assert node.attr in {'stdin', 'buffer', 'read', 'split'}
        assert not isinstance(node, (ast.While, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.With, ast.Try))
    return compile(tree, '<solution>', 'exec')


def run(code, stdin):
    previous = sys.stdin
    sys.stdin = io.TextIOWrapper(io.BytesIO(stdin.encode()))
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            exec(code, {'__name__': '__main__'})
    finally:
        sys.stdin = previous
    return out.getvalue().split()


def valid(actual, test):
    if len(actual) != len(test['expected']):
        return False
    for actual_value, expected in zip(actual, test['expected']):
        if isinstance(expected, str):
            if actual_value != expected:
                return False
        else:
            try:
                tolerance = 0.05000001 if test.get('precision') == 1 else 1e-9 * max(1, abs(expected))
                if not math.isfinite(float(actual_value)) or abs(float(actual_value) - expected) > tolerance:
                    return False
                if test.get('precision') == 1 and not re.fullmatch(r'-?\d+\.\d', actual_value):
                    return False
            except ValueError:
                return False
    return True


payload = json.load(sys.stdin)
program = compile_program(payload['code'])
for index, test in enumerate(payload['tests']):
    actual = run(program, test['input'])
    assert valid(actual, test), (index, test, actual)
rejected = 0
mutation = compile_program(payload['mutant'])
for test in payload['tests']:
    try:
        rejected += not valid(run(mutation, test['input']), test)
    except (StopIteration, TypeError, ZeroDivisionError):
        rejected += 1
assert rejected, 'The deliberately incorrect program escaped the independent cases'
print(json.dumps({'tests': len(payload['tests']), 'rejectedMutationCases': rejected}))
