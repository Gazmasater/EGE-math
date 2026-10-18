"""Geometric oracles transcribed from the reviewed FIPI conditions and images.
No solution commands or generated program are used to build target cells.
"""
import json, sys

D = {'U': (0, -1), 'D': (0, 1), 'L': (-1, 0), 'R': (1, 0)}

def edge(a, b):
    return tuple(sorted((tuple(a), tuple(b))))

class World:

    def __init__(self):
        self.walls = set()
        self.target = set()
        self.start = (0, 0)
        self.finish = None

    def horizontal(self, y, a, b, holes=()):
        for x in range(a, b):
            if x not in holes:
                self.walls.add(edge((x, y - 1), (x, y)))

    def vertical(self, x, a, b, holes=()):
        for y in range(a, b):
            if y not in holes:
                self.walls.add(edge((x - 1, y), (x, y)))

    def transformed(self, mapping):
        right = D[mapping['R']]
        down = D[mapping['D']]

        def point(p):
            return (p[0] * right[0] + p[1] * down[0], p[0] * right[1] + p[1] * down[1])
        w = World()
        w.walls = {edge(point(a), point(b)) for (a, b) in self.walls}
        w.target = {point(p) for p in self.target}
        w.start = point(self.start)
        w.finish = point(self.finish) if self.finish else None
        return w

def single(a, b, s, mode):
    w = World()
    w.horizontal(0, 0, a)
    w.start = (s % a, -1)
    w.target = {(x, -2 if mode == 'offset' else 0 if mode == 'below' else -1) for x in range(a)}
    if mode == 'both':
        w.target |= {(x, 0) for x in range(a)}
        w.start = (0, -1)
    if mode == 'offset':
        w.start = (0, -1)
    return w

def corridor(a, b, s, mode):
    w = World()
    w.horizontal(0, 0, a)
    w.horizontal(1, 0, a)
    w.vertical(0, 0, 1)
    w.vertical(a, 0, 1)
    w.start = (s % a, 0) if mode == 'any' else (0, 0)
    w.target = {(x, 0) for x in range(a)}
    if mode == 'return':
        w.finish = w.start
    return w

def ushape(a, b, s, mode):
    w = World()
    w.horizontal(0, 0, a)
    w.vertical(0, 0, b)
    w.vertical(a, 0, b)
    w.start = (s % a, b - 1) if mode == 'out' else (s % a, -1)
    w.target = {(x, -1 if mode == 'out' else 0) for x in range(a)}
    return w

def obstacle(a, b, s):
    w = World()
    w.horizontal(0, 0, a)
    w.horizontal(b, 0, a)
    w.vertical(0, 0, b)
    w.vertical(a, 0, b)
    w.start = (a + 1 + s % 4, s % b)
    w.target = {(x, -1) for x in range(a)}
    return w

def parallel(a, b, s, mode):
    w = World()
    w.horizontal(0, 0, a)
    w.horizontal(b, 0, a)
    w.start = (s % a, b if mode == 'lower' else 0)
    w.target = {(x, y) for x in range(a) for y in [0, b]}
    return w

def inner(a, b, s, mode):
    w = World()
    w.horizontal(0, 0, a)
    w.horizontal(b, 0, a)
    w.start = (0, b - 1)
    if mode == 'both':
        w.target = {(x, y) for x in range(a) for y in [0, b - 1]}
    elif mode == 'left-corner':
        w.target = {(0, y) for y in range(b)} | {(a - 1, 0)}
    elif mode == 'except':
        w.target = {w.start} | {(x, 0) for x in range(1, a)}
    elif mode == 'three':
        w.target = {w.start, (a - 1, b - 1), (a - 1, 0)}
    elif mode == 'right-column':
        w.target = {(a - 1, y) for y in range(b)}
    return w

def rectangle(a, b, s, mode):
    w = obstacle(a, b, s)
    w.start = (0, 0)
    if mode == 'bottom':
        w.target = {(x, b - 1) for x in range(a)}
    elif mode == 'bottom-right':
        w.target = {(x, b - 1) for x in range(a)} | {(a - 1, y) for y in range(b)}
    elif mode == 'top-bottom':
        w.target = {(x, y) for x in range(a) for y in [0, b - 1]}
    else:
        w.target = {(x, y) for x in [0, a - 1] for y in [0, b - 1]}
    return w

def uvar(a, b, s, mode):
    c = 1 + s % 7
    w = World()
    w.horizontal(0, 0, a)
    w.vertical(0, 0, b)
    w.vertical(a, 0, c)
    w.start = (0, b - 1)
    if mode == 'left-corner':
        w.target = {(0, y) for y in range(b)} | {(a - 1, 0)}
    elif mode == 'start-right':
        w.target = {w.start} | {(a - 1, y) for y in range(c)}
    else:
        w.target = {(x, 0) for x in range(a)} | {(a - 1, y) for y in range(c)}
    return w

def corner(a, b, s, mode):
    w = World()
    w.horizontal(0, 0, a)
    w.vertical(a, 0, b)
    w.start = (0, -1)
    w.target = {(x, -1) for x in range(a + 1)} | {(a, y) for y in range(b)}
    return w

def innercorner(a, b, s):
    w = World()
    w.horizontal(0, 0, a)
    w.vertical(a, -b, 0)
    w.start = (a - 1, -1)
    w.target = {(x, -1) for x in range(a)} | {(a - 1, y) for y in range(-b, 0)}
    return w

def zig(a, b, s, mode):
    c = 1 + s % 7
    w = World()
    w.vertical(0, 0, a)
    w.horizontal(a, 0, b)
    w.vertical(b, a, a + c)
    if mode == 'right':
        w.start = (b - 1, a + c - 1)
        w.target = {(0, y) for y in range(a)} | {(b, y) for y in range(a, a + c)}
    else:
        w.start = (0, 0)
        w.target = {(-1, y) for y in range(a)} | {(b - 1, y) for y in range(a, a + c)}
    return w

def zigh(a, b, s, mode):
    c = 1 + s % 7
    w = World()
    w.horizontal(0, 0, a)
    w.vertical(a, 0, b)
    w.horizontal(b, a, a + c)
    w.start = (0, -1)
    w.target = {(a, y) for y in range(b)} | ({(x, b - 1) for x in range(a, a + c)} if mode == 'last' else {(x, -1) for x in range(a + 1)})
    return w

def cshape(a, b, s, mode):
    c = 1 + s % 7
    w = World()
    w.horizontal(0, 0, a)
    w.vertical(a, 0, b)
    w.horizontal(b, a - c, a)
    w.start = (a - 1, b - 1)
    w.target = {(x, b) for x in range(a - c, a)} if mode == 'bottom' else {(a, y) for y in range(b)}
    return w

def snake(a, b, s, mode):
    c = 1 + s % 5
    d = 1 + s // 5 % 5
    e = 1 + s // 25 % 5
    w = World()
    if mode == 'horizontal':
        w.horizontal(0, 0, a)
        w.vertical(a, 0, b)
        w.horizontal(b, a - c, a)
        w.vertical(a - c, b, b + d)
        w.horizontal(b + d, a - c, a - c + e)
        w.start = (0, 0)
        w.target = {(x, 0) for x in range(a)} | {(a - 1, y) for y in range(b)} | {(a - c - 1, y) for y in range(b, b + d + 1)} | {(x, b + d) for x in range(a - c, a - c + e)}
    else:
        w.vertical(0, 0, a)
        w.horizontal(a, 0, b)
        w.vertical(b, a - c, a)
        w.horizontal(a - c, b, b + d)
        w.vertical(b + d, a - c, a - c + e)
        w.start = (-1, 0)
        w.target = {(-1, y) for y in range(a + 1)} | {(x, a) for x in range(b)} | {(x, a - c) for x in range(b, b + d)} | {(b + d - 1, y) for y in range(a - c, a - c + e)}
    return w

def rectgap(a, b, s, mode):
    a += 2
    b += 2
    holes = hole(b, s)
    bottom = hole(a, s // ((b - 2) * (b - 1) // 2)) if mode == 'inside' else ()
    w = World()
    w.horizontal(0, 0, a)
    w.horizontal(b, 0, a, holes=bottom)
    w.vertical(a, 0, b)
    w.vertical(0, 0, b, holes)
    w.start = (-1, b - 1)
    if mode == 'outside':
        w.target = {(x, y) for x in range(-1, a + 1) for y in [-1, b]} | {(a, y) for y in range(b)} | {(-1, y) for y in range(b) if y not in holes}
    else:
        w.target = {(x, 0) for x in range(a)} | {(a - 1, y) for y in range(b)} | {(0, y) for y in range(b) if y not in holes} | {(x, b - 1) for x in range(a) if x not in bottom}
    return w

def divided(a, b, s):
    a += 2
    b += 2
    w = rectangle(a, b, s, 'bottom')
    w.target = set()
    k = 1 + s % (a - 1)
    g = 1 + s // a % (b - 2)
    w.vertical(k, 0, b, [g])
    w.start = (0, 0)
    w.finish = (a - 1, b - 1)
    return w

def hole(length, seed):
    options = [range(g, end) for g in range(1, length - 1) for end in range(g + 1, length)]
    return options[seed % len(options)]

def lgap(a, b, s, mode):
    a += 2
    b += 2
    hg = hole(a, s)
    vg = hole(b, s // ((a - 2) * (a - 1) // 2))
    w = World()
    if mode == 'inner':
        w.horizontal(0, 0, a, hg)
        w.vertical(a, 0, b, vg)
        w.start = (0, 0)
        w.target = {(x, 0) for x in range(a) if x not in hg} | {(a - 1, y) for y in range(b) if y not in vg}
    elif mode == 'horizontal':
        w.horizontal(0, 0, a, hg)
        w.vertical(a, -b, 0)
        w.start = (a - 1, -b)
        w.target = {(x, y) for x in range(a) if x not in hg for y in [-1, 0]}
    else:
        vg = [-1 - y for y in vg]
        w.horizontal(0, 0, a)
        w.vertical(a, -b, 0, vg)
        w.start = (0, -1)
        w.target = {(x, y) for x in [a - 1, a] for y in range(-b, 0) if y not in vg}
    return w

def stairs(a, b, s, width, height, mode):
    w = World()
    heights = [-height * i for i in range(a + 1)] + [-height * a + height * i for i in range(1, b + 1)]
    if mode == 'valley':
        heights = [-y for y in heights]
    for (i, y) in enumerate(heights):
        w.horizontal(y, i * width, (i + 1) * width)
        if i:
            w.vertical(i * width, min(y, heights[i - 1]), max(y, heights[i - 1]))
        w.target |= {(x, y if mode == 'under' else y - 1) for x in range(i * width, (i + 1) * width)}
    w.start = (0, -1)
    return w

def rising(a, b, s):
    w = World()
    w.horizontal(0, -100, 0)
    w.start = (-1 - s % 15, -1)
    for i in range(a):
        w.vertical(3 * i, -i - 1, -i)
        w.horizontal(-i - 1, 3 * i, 3 * i + 3)
        w.target |= {(x, -i - 2) for x in range(3 * i, 3 * i + 3)}
    return w

def risers(a, b, s):
    w = World()
    w.horizontal(0, -100, 0)
    for i in range(a):
        w.vertical(3 * i, 2 * i, 2 * i + 2)
        w.horizontal(2 * i + 2, 3 * i, 3 * i + 3 if i < a - 1 else 3 * i + 100)
        w.target |= {(3 * i, y) for y in [2 * i, 2 * i + 1]}
    w.start = (3 * (a - 1) + 1 + s % 15, 2 * a - 1)
    return w

def switchback(a, b, s):
    w = World()
    w.start = (0, 0)
    for i in range(a):
        w.vertical(-2 * i, i, i + 1)
        w.horizontal(i + 1, -2 * i - 2, -2 * i)
    w.vertical(-2 * a, a, a + 1)
    for i in range(b):
        x = -2 * a + 2 * i
        y = a + 1 + i
        w.horizontal(y, x, x + 2)
        w.target |= {(x, y - 1), (x + 1, y - 1)}
        if i < b - 1:
            w.vertical(x + 2, y, y + 1)
    return w
GENERATORS = {'single-above': lambda a, b, s: single(a, b, s, 'above'), 'single-below': lambda a, b, s: single(a, b, s, 'below'), 'single-both': lambda a, b, s: single(a, b, s, 'both'), 'single-offset': lambda a, b, s: single(a, b, s, 'offset'), 'corridor-any': lambda a, b, s: corridor(a, b, s, 'any'), 'corridor-return': lambda a, b, s: corridor(a, b, s, 'return'), 'u-out': lambda a, b, s: ushape(a, b, s, 'out'), 'u-in': lambda a, b, s: ushape(a, b, s, 'in'), 'obstacle': obstacle, 'parallel-lower': lambda a, b, s: parallel(a, b, s, 'lower'), 'parallel-upper': lambda a, b, s: parallel(a, b, s, 'upper'), 'inner-both': lambda a, b, s: inner(a, b, s, 'both'), 'inner-left-corner': lambda a, b, s: inner(a, b, s, 'left-corner'), 'inner-except': lambda a, b, s: inner(a, b, s, 'except'), 'inner-three': lambda a, b, s: inner(a, b, s, 'three'), 'inner-column': lambda a, b, s: inner(a, b, s, 'right-column'), 'rectangle-bottom': lambda a, b, s: rectangle(a, b, s, 'bottom'), 'rectangle-bottom-right': lambda a, b, s: rectangle(a, b, s, 'bottom-right'), 'rectangle-top-bottom': lambda a, b, s: rectangle(a, b, s, 'top-bottom'), 'rectangle-corners': lambda a, b, s: rectangle(a, b, s, 'corners'), 'u-left-corner': lambda a, b, s: uvar(a, b, s, 'left-corner'), 'u-start-right': lambda a, b, s: uvar(a, b, s, 'start-right'), 'u-top-right': lambda a, b, s: uvar(a, b, s, 'top-right'), 'outer-corner': lambda a, b, s: corner(a, b, s, 'outer'), 'inner-corner': innercorner, 'zig-right': lambda a, b, s: zig(a, b, s, 'right'), 'zig-left': lambda a, b, s: zig(a, b, s, 'left'), 'zigh-last': lambda a, b, s: zigh(a, b, s, 'last'), 'zigh-first': lambda a, b, s: zigh(a, b, s, 'first'), 'c-bottom': lambda a, b, s: cshape(a, b, s, 'bottom'), 'c-right': lambda a, b, s: cshape(a, b, s, 'right'), 'snake-horizontal': lambda a, b, s: snake(a, b, s, 'horizontal'), 'snake-vertical': lambda a, b, s: snake(a, b, s, 'vertical'), 'rectangle-gap-out': lambda a, b, s: rectgap(a, b, s, 'outside'), 'rectangle-gap-in': lambda a, b, s: rectgap(a, b, s, 'inside'), 'divided': divided, 'l-gap-inner': lambda a, b, s: lgap(a, b, s, 'inner'), 'l-gap-horizontal': lambda a, b, s: lgap(a, b, s, 'horizontal'), 'l-gap-vertical': lambda a, b, s: lgap(a, b, s, 'vertical'), 'hill-1-1': lambda a, b, s: stairs(a, b, s, 1, 1, 'hill'), 'hill-2-1': lambda a, b, s: stairs(a, b, s, 2, 1, 'hill'), 'hill-1-2': lambda a, b, s: stairs(a, b, s, 1, 2, 'hill'), 'valley-2-1': lambda a, b, s: stairs(a, b, s, 2, 1, 'valley'), 'hill-under': lambda a, b, s: stairs(a, b, s, 1, 1, 'under'), 'rising-3-1': rising, 'risers-3-2': risers, 'switchback': switchback}

def parameters(family):
    cases = {(a,b,s) for a in [1,2,3,5,9] for b in [1,2,3,7] for s in [0,1,2,8,19,26,99,124,1999]}
    if family.startswith('snake'):
        cases.update((a,b,s) for a in [1,2,5] for b in [1,2,5] for s in range(125))
    if 'gap' in family:
        cases.update((a,b,s) for a in range(1,6) for b in range(1,6) for s in range((a*(a+1)//2)*(b*(b+1)//2)))
    return sorted(cases)

def worlds(model):
    result=[]
    for a,b,s in parameters(model['family']):
        w=GENERATORS[model['family']](a,b,s).transformed(model['directions'])
        result.append(dict(parameters=[a,b,s],walls=sorted(w.walls),target=sorted(w.target),start=w.start,finish=w.finish))
    return result

if __name__ == '__main__':
    json.dump(worlds(json.load(sys.stdin)),sys.stdout)
