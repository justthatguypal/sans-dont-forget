import numpy as np
from PIL import Image

SRC = r"C:/Users/deboe/Downloads/PC _ Computer - Undertale - Enemies & Bosses - Sans.png"
im = Image.open(SRC).convert("RGBA")
a = np.array(im)
print("size", im.size)
cols, counts = np.unique(a.reshape(-1, 4), axis=0, return_counts=True)
order = np.argsort(-counts)
print("top colors:")
for i in order[:6]:
    print("  ", cols[i].tolist(), counts[i])

bg = cols[order[0]].astype(int)
# mask of pixels that are not background-ish
d = np.abs(a[:, :, :3].astype(int) - bg[:3]).sum(axis=2)
mask = d > 30
print("mask px", int(mask.sum()))

try:
    from scipy import ndimage
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    print("scipy labels", n)
    objs = ndimage.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs):
        ys, xs = sl
        area = int((lab[sl] == i + 1).sum())
        comps.append((xs.start, ys.start, xs.stop, ys.stop, area))
except ImportError:
    print("no scipy")
    comps = []

comps.sort(key=lambda c: (c[1] // 8, c[0]))
print("comps:", len(comps))
for c in comps:
    x0, y0, x1, y1, area = c
    print(f"  x0={x0:4d} y0={y0:4d} w={x1-x0:4d} h={y1-y0:4d} area={area:6d}")
