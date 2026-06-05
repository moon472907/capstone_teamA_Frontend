#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
캐릭터 에셋 후처리 스크립트.

public/assets/images/characters/<key>/ 아래의 원본 이미지를 읽어:
  1) 배경(그레이스케일/체커보드/단색)을 테두리에서 flood-fill 하여 투명 처리
  2) idle/run 스프라이트시트는 connected-component 로 프레임을 자동 추출 후
     하단-중앙 정렬의 균일한 가로 스트립으로 재패킹 (Phaser spritesheet 호환)
  3) 아무 접미사 없는 파일은 아이콘으로 보고 배경 제거 + 오토크롭
  4) characters.json 매니페스트 생성

원본은 보존하고, 처리 결과는 같은 폴더에 idle.png / run.png / icon.png 로 저장한다.
"""
import os, sys, glob, json
from collections import deque, Counter
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "images", "characters")
ROOT = os.path.abspath(ROOT)
WEB_PREFIX = "/assets/images/characters"

# max-min <= 이 값이면 "무채색"(배경 후보).
# 캐릭터 외곽선과 흰 옷 사이의 안티에일리어싱 경계(약한 청회색, spread~30)가
# 막히도록 작게 잡아야 흰 가운/점퍼로 flood-fill 이 새어들지 않는다.
SAT_TOL = 16
CONTENT_ALPHA = 20  # 프레임 추출 시 이 알파 초과면 내용물

# 표시 이름(키 -> 한글)
DISPLAY_NAMES = {
    "agriculture_duri": "농학두리",
    "graduate_duri":    "졸업두리",
    "gym_duri":         "헬스두리",
    "medical_duri":     "의학두리",
    "nurse_duri":       "간호두리",
    "laboratory_duri":  "연구두리",
}

# 입력으로 받을 이미지 확장자(jpg 는 알파가 없어도 배경 제거 후 png 로 저장)
IN_EXTS = ("*.png", "*.jpg", "*.jpeg")

LUMA_TOL = 40       # 배경 음영 밝기와 이 값 이내일 때만 배경으로 제거
HOLE_MAX = 800      # 캐릭터 내부의 이 크기 미만 투명 구멍은 메움(누수 잔여 정리)


def neutral(r, g, b):
    return (max(r, g, b) - min(r, g, b)) <= SAT_TOL


def _detect_bg_shades(px, w, h):
    """테두리의 무채색 픽셀 밝기 히스토그램에서 배경 음영(체커 2색 등)을 추정."""
    c = Counter()
    pts = ([(x, 0) for x in range(0, w, 2)] + [(x, h - 1) for x in range(0, w, 2)] +
           [(0, y) for y in range(0, h, 2)] + [(w - 1, y) for y in range(0, h, 2)])
    for x, y in pts:
        r, g, b = px[x, y][:3]
        if neutral(r, g, b):
            c[int(round((r + g + b) / 3 / 8)) * 8] += 1
    return [s for s, _ in c.most_common(4)] or [255, 0]


def remove_background(im):
    """테두리에서 flood fill 로 배경을 투명화.
    배경 후보 = 무채색 AND 배경 음영(테두리에서 추정) 밝기와 LUMA_TOL 이내.
    밝기 게이팅 덕분에 어두운 배경 위의 흰 가운(밝음)이 같은 무채색이라도
    통로가 끊겨 캐릭터 내부로 누수되지 않는다.
    마지막에 캐릭터 내부의 작은 투명 구멍(누수 잔여)을 원색으로 메운다."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    shades = _detect_bg_shades(px, w, h)
    data = bytearray(im.tobytes())          # RGBA, 4 byte/px
    orig = bytes(data)
    visited = bytearray(w * h)
    dq = deque()

    def seed(x, y):
        i = y * w + x
        if not visited[i]:
            visited[i] = 1
            dq.append(i)

    for x in range(w):
        seed(x, 0); seed(x, h - 1)
    for y in range(h):
        seed(0, y); seed(w - 1, y)

    def is_bg(r, g, b):
        if (max(r, g, b) - min(r, g, b)) > SAT_TOL:
            return False
        l = (r + g + b) / 3
        return any(abs(l - s) <= LUMA_TOL for s in shades)

    while dq:
        i = dq.popleft()
        p = i * 4
        r, g, b, a = data[p], data[p + 1], data[p + 2], data[p + 3]
        if a == 0:
            pass                              # 이미 투명한 배경 -> 전파
        elif is_bg(r, g, b):
            data[p + 3] = 0                   # 배경 -> 투명화
        else:
            continue                          # 캐릭터 -> 경계, 전파 중단
        x = i % w
        y = i // w
        if x > 0:     seed(x - 1, y)
        if x < w - 1: seed(x + 1, y)
        if y > 0:     seed(x, y - 1)
        if y < h - 1: seed(x, y + 1)

    _fill_small_holes(data, orig, w, h)
    return Image.frombytes("RGBA", (w, h), bytes(data))


def _fill_small_holes(data, orig, w, h):
    """테두리와 연결되지 않은(=캐릭터 내부) 투명 영역 중 HOLE_MAX 미만은 원색으로 복원."""
    reach = bytearray(w * h)
    dq = deque()

    def seed(i):
        if not reach[i] and data[i * 4 + 3] == 0:
            reach[i] = 1
            dq.append(i)

    for x in range(w):
        seed(x); seed((h - 1) * w + x)
    for y in range(h):
        seed(y * w); seed(y * w + w - 1)
    while dq:
        i = dq.popleft()
        x = i % w; y = i // w
        if x > 0:     seed(i - 1)
        if x < w - 1: seed(i + 1)
        if y > 0:     seed(i - w)
        if y < h - 1: seed(i + w)

    labeled = bytearray(w * h)
    for start in range(w * h):
        if data[start * 4 + 3] != 0 or reach[start] or labeled[start]:
            continue
        comp = [start]; labeled[start] = 1; head = 0
        while head < len(comp):
            i = comp[head]; head += 1
            x = i % w; y = i // w
            for j in ((i - 1) if x > 0 else -1, (i + 1) if x < w - 1 else -1,
                      (i - w) if y > 0 else -1, (i + w) if y < h - 1 else -1):
                if j >= 0 and data[j * 4 + 3] == 0 and not reach[j] and not labeled[j]:
                    labeled[j] = 1; comp.append(j)
        if len(comp) < HOLE_MAX:              # 작은 내부 구멍만 복원
            for i in comp:
                p = i * 4
                data[p] = orig[p]; data[p + 1] = orig[p + 1]
                data[p + 2] = orig[p + 2]; data[p + 3] = 255


# 캐릭터별 흰 옷 -> 지정 색 리컬러 (key -> (r,g,b) 목표색)
RECOLOR_CLOTHES = {
    "nurse_duri": (120, 170, 135),   # 간호두리: 흰 가운 -> 초록 수술복(전용 아이콘 색)
}


def recolor_clothes(im, boxes, target, cut=0.46):
    """각 프레임 bbox 의 하단(=몸통/가운)만 흰 옷 -> target 색으로 명암 유지하며 치환.
    머리(상단 cut 비율)는 건드리지 않으므로 주둥이·눈·고글이 흰색 그대로 보존된다."""
    tr, tg, tb = target
    ref = 235
    px = im.load()
    for (minx, miny, maxx, maxy) in boxes:
        cy = miny + int((maxy - miny) * cut)
        for y in range(cy, maxy + 1):
            for x in range(minx, maxx + 1):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if (max(r, g, b) - min(r, g, b)) <= 18 and (r + g + b) / 3 >= 192:
                    f = min(1.12, ((r + g + b) / 3) / ref)
                    px[x, y] = (int(tr * f), int(tg * f), int(tb * f), a)
    return im


def label_components(im):
    """알파>CONTENT_ALPHA 인 픽셀의 8-연결 컴포넌트 라벨링. (comp bboxes, areas) 반환."""
    w, h = im.size
    alpha = im.tobytes("raw", "A")            # h*w 바이트
    label = [0] * (w * h)
    comps = []                                # (minx,miny,maxx,maxy,area)
    cur = 0
    NEI = (-1, 0, 1)
    for start in range(w * h):
        if alpha[start] <= CONTENT_ALPHA or label[start]:
            continue
        cur += 1
        minx = maxx = start % w
        miny = maxy = start // w
        area = 0
        stack = [start]
        label[start] = cur
        while stack:
            i = stack.pop()
            x = i % w
            y = i // w
            area += 1
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
            for dy in NEI:
                ny = y + dy
                if ny < 0 or ny >= h:
                    continue
                base = ny * w
                for dx in NEI:
                    if dx == 0 and dy == 0:
                        continue
                    nx = x + dx
                    if nx < 0 or nx >= w:
                        continue
                    j = base + nx
                    if not label[j] and alpha[j] > CONTENT_ALPHA:
                        label[j] = cur
                        stack.append(j)
        comps.append([minx, miny, maxx, maxy, area])
    return comps


def merge_boxes(comps, w):
    """겹치거나 아주 가까운(같은 캐릭터의 분리 조각) 컴포넌트를 병합한 뒤,
    가장 큰 프레임의 4% 미만(JPG 점·얼룩 등 노이즈)은 제거한다.
    소간격(폭의 0.8%)만 병합하므로 staggered 로 떨어진 별개 캐릭터는 합쳐지지 않는다."""
    if not comps:
        return []
    gap = max(8, int(w * 0.008))
    items = [list(c) for c in comps]   # [minx,miny,maxx,maxy,area]

    def near(a, b):
        return not (a[2] + gap < b[0] or b[2] + gap < a[0] or
                    a[3] + gap < b[1] or b[3] + gap < a[1])

    merged = True
    while merged:
        merged = False
        out = []
        for bx in items:
            for o in out:
                if near(o, bx):
                    o[0] = min(o[0], bx[0]); o[1] = min(o[1], bx[1])
                    o[2] = max(o[2], bx[2]); o[3] = max(o[3], bx[3])
                    o[4] += bx[4]
                    merged = True
                    break
            else:
                out.append(list(bx))
        items = out

    max_area = max(b[4] for b in items)
    return [b[:4] for b in items if b[4] >= max_area * 0.04]


def sort_reading_order(boxes):
    """행(밴드)으로 묶은 뒤 행 내 x 정렬 -> 좌상단부터 읽기 순서."""
    if not boxes:
        return boxes
    heights = [b[3] - b[1] for b in boxes]
    row_tol = (sorted(heights)[len(heights) // 2]) * 0.6   # 중앙값 높이의 60%
    items = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    rows = []
    for b in items:
        cy = (b[1] + b[3]) / 2
        for row in rows:
            if abs(row[0] - cy) <= row_tol:
                row[1].append(b)
                row[0] = (row[0] * (len(row[1]) - 1) + cy) / len(row[1])
                break
        else:
            rows.append([cy, [b]])
    rows.sort(key=lambda r: r[0])
    ordered = []
    for _, row in rows:
        row.sort(key=lambda b: (b[0] + b[2]) / 2)
        ordered.extend(row)
    return ordered


def build_strip(im, boxes, pad=6):
    """프레임들을 하단-중앙 정렬의 균일 가로 스트립으로 재패킹."""
    crops = []
    for (minx, miny, maxx, maxy) in boxes:
        crops.append(im.crop((minx, miny, maxx + 1, maxy + 1)))
    fw = max(c.width for c in crops) + pad * 2
    fh = max(c.height for c in crops) + pad * 2
    n = len(crops)
    strip = Image.new("RGBA", (fw * n, fh), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        ox = i * fw + (fw - c.width) // 2          # 가로 중앙
        oy = fh - pad - c.height                   # 하단 정렬(발 맞춤)
        strip.paste(c, (ox, oy), c)
    return strip, fw, fh, n


def autocrop(im, pad=4):
    bbox = im.getbbox()
    if not bbox:
        return im
    im = im.crop(bbox)
    out = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    out.paste(im, (pad, pad), im)
    return out


def process_sheet(src_path, dst_path, recolor=None):
    im = remove_background(Image.open(src_path))
    comps = label_components(im)
    boxes = merge_boxes(comps, im.width)
    boxes = sort_reading_order(boxes)
    if not boxes:
        raise RuntimeError(f"프레임 없음: {src_path}")
    if recolor:
        recolor_clothes(im, boxes, recolor)
    strip, fw, fh, n = build_strip(im, boxes)
    strip.save(dst_path)
    return {"sheet": dst_path, "frameWidth": fw, "frameHeight": fh, "frames": n}


def process_icon(src_path, dst_path):
    im = remove_background(Image.open(src_path))
    im = autocrop(im)
    im.save(dst_path)
    return dst_path


def web(path):
    rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
    return f"{WEB_PREFIX}/{rel}"


def list_images(folder):
    files = []
    for pat in IN_EXTS:
        files += glob.glob(os.path.join(folder, pat))
    return sorted(files)


def find_sheet(folder, kind):
    """폴더 내에서 _idle / _run 접미사 파일 1개를 찾는다(파일명 키 불일치/확장자 허용)."""
    for f in list_images(folder):
        name = os.path.splitext(os.path.basename(f).lower())[0]
        if name.endswith(f"_{kind}"):
            return f
    return None


def find_icon(folder):
    for f in list_images(folder):
        name = os.path.basename(f).lower()
        stem = os.path.splitext(name)[0]
        if "_idle" in stem or "_run" in stem:
            continue
        if stem in ("idle", "run", "icon"):   # 이전 산출물 제외
            continue
        return f
    return None


def main():
    manifest = {}
    folders = [d for d in sorted(glob.glob(os.path.join(ROOT, "*")))
               if os.path.isdir(d)]
    for folder in folders:
        key = os.path.basename(folder)
        if key not in DISPLAY_NAMES:
            print(f"skip (애니메이션 없는 폴더): {key}")
            continue
        idle_src = find_sheet(folder, "idle")
        run_src = find_sheet(folder, "run")
        if not idle_src or not run_src:
            print(f"skip (idle/run 누락): {key}")
            continue

        print(f"처리 중: {key}")
        entry = {"key": key, "name": DISPLAY_NAMES.get(key, key)}

        recolor = RECOLOR_CLOTHES.get(key)
        idle_info = process_sheet(idle_src, os.path.join(folder, "idle.png"), recolor)
        run_info = process_sheet(run_src, os.path.join(folder, "run.png"), recolor)
        print(f"  idle: {idle_info['frames']} frames @ {idle_info['frameWidth']}x{idle_info['frameHeight']}")
        print(f"  run : {run_info['frames']} frames @ {run_info['frameWidth']}x{run_info['frameHeight']}")

        # 아이콘: 전용 아이콘 원본은 흰 배경+흰 가운+밝은 외곽선이라 배경 제거 시
        # 옷이 침식되는 경우가 있어, 외곽선이 진해 깔끔하게 처리되는 idle 첫 프레임을
        # 잘라 아이콘으로 사용한다(모든 캐릭터 일관된 스타일).
        im = Image.open(os.path.join(folder, "idle.png"))
        fw = idle_info["frameWidth"]
        frame0 = autocrop(im.crop((0, 0, fw, im.height)))
        icon_dst = os.path.join(folder, "icon.png")
        frame0.save(icon_dst)
        entry["icon"] = web(icon_dst)
        print("  icon: idle 첫 프레임에서 생성")

        entry["idle"] = {"sheet": web(idle_info["sheet"]),
                         "frameWidth": idle_info["frameWidth"],
                         "frameHeight": idle_info["frameHeight"],
                         "frames": idle_info["frames"]}
        entry["run"] = {"sheet": web(run_info["sheet"]),
                        "frameWidth": run_info["frameWidth"],
                        "frameHeight": run_info["frameHeight"],
                        "frames": run_info["frames"]}
        manifest[key] = entry

    out_path = os.path.join(ROOT, "characters.json")
    # 프론트엔드에서 import 할 수 있도록 src 에도 같은 매니페스트를 복사한다.
    src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..",
                                            "src", "data", "characterManifest.json"))
    for path in (out_path, src_path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\n매니페스트 작성: {out_path}\n              {src_path}")


if __name__ == "__main__":
    main()
