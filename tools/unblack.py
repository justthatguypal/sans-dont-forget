"""Make the flat black background of the sliced body sprites transparent.

The sheet was cut with its black backdrop left in, which is invisible against
the game's black background but shows as a black box as soon as anything glows
behind Sans (the astral aura). Flood fill from the border only, so the black
lines inside the drawing are kept.
"""
import glob
import sys
from collections import deque

from PIL import Image

TARGETS = glob.glob('assets/sprites/handdown_*.png') + glob.glob('assets/sprites/handup_*.png')
THRESH = 26

for path in sorted(TARGETS):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()

    def dark(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and r < THRESH and g < THRESH and b < THRESH

    seen = set()
    q = deque()

    def push(x, y):
        if 0 <= x < w and 0 <= y < h and (x, y) not in seen and dark(x, y):
            seen.add((x, y))
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    im.save(path)
    print('cleared', path, len(seen), 'px')
