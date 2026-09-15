"""
Chrome Web Store asset composer (v4) — YepIts.ai extension.

Pure-Pillow, no Playwright, no source images. Renders 5 store screenshots
(1280x800), 1 promo tile (440x280), and 1 marquee (1400x560) from scratch.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont


# Brand tokens
CREAM     = (250, 246, 240)
CREAM_200 = (245, 239, 230)
CREAM_300 = (240, 235, 227)
WHITE     = (255, 255, 255)
CLAY      = (255, 79, 0)
CLAY_DARK = (217, 64, 0)
CLAY_SOFT = (255, 232, 221)
INK       = (26, 26, 26)
INK_MUTED = (102, 102, 102)
INK_FAINT = (153, 153, 153)
BORDER    = (224, 219, 209)
MOSS      = (0, 200, 83)
WARN_BG   = (254, 242, 242)
WARN_FG   = (220, 38, 38)
RED       = (255, 0, 0)
TED_RED   = (224, 36, 36)
BLUE      = (3, 91, 169)


def font(size, bold=True):
    paths = [
        '/System/Library/Fonts/Supplemental/Inter-Bold.otf',
        '/System/Library/Fonts/Supplemental/Inter-Regular.otf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Inter-Bold.otf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    if not bold:
        paths = [
            '/System/Library/Fonts/Supplemental/Inter-Regular.otf',
            '/System/Library/Fonts/Supplemental/Arial.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
            '/Library/Fonts/Inter-Regular.otf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        ] + paths
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def tw(d, s, f):
    try:
        return int(round(d.textlength(s, font=f)))
    except AttributeError:
        return d.textbbox((0, 0), s, font=f)[2]


def vgrad(size, top, bot):
    W, H = size
    im = Image.new('RGB', (W, H), top)
    px = im.load()
    for y in range(H):
        t = y / max(1, H - 1)
        c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = c
    return im


def rr(d, x0, y0, x1, y1, r, fill=None, outline=None, w=1):
    if fill is not None:
        d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=fill)
    if outline is not None and w:
        for i in range(w):
            d.rounded_rectangle((x0 - i, y0 - i, x1 + i, y1 + i),
                                radius=r + i, outline=outline)


def el(d, x0, y0, x1, y1, fill=None, outline=None, w=1):
    if fill is not None:
        d.ellipse((x0, y0, x1, y1), fill=fill)
    if outline is not None and w:
        d.ellipse((x0, y0, x1, y1), outline=outline, width=w)


def bolt(d, cx, cy, size, color):
    """Draw a stylized lightning bolt centered at (cx, cy)."""
    s = size
    pts = [
        (cx + s * 0.00, cy - s * 0.50),
        (cx - s * 0.40, cy + s * 0.05),
        (cx - s * 0.08, cy + s * 0.05),
        (cx - s * 0.20, cy + s * 0.50),
        (cx + s * 0.40, cy - s * 0.10),
        (cx + s * 0.08, cy - s * 0.10),
    ]
    d.polygon(pts, fill=color)


def brand_mark(d, x, y, size=96, bg=None):
    if bg is None:
        bg = CLAY
    rr(d, x, y, x + size, y + size, int(size * 0.22), fill=bg)
    f = font(int(size * 0.58), bold=True)
    label = 'Y'
    w = tw(d, label, f)
    bbox = d.textbbox((0, 0), label, font=f)
    h = bbox[3] - bbox[1]
    d.text((x + (size - w) / 2 - 1, y + (size - h) / 2 - int(size * 0.06)),
           label, font=f, fill=WHITE)


def shadow(w, h, radius=14, blur=24, opacity=42, dy=8):
    sw = w + 2 * blur
    sh = h + 2 * blur + dy
    im = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
    dd = ImageDraw.Draw(im)
    dd.rounded_rectangle((blur, blur, blur + w, blur + h),
                         radius=radius, fill=(0, 0, 0, opacity))
    return im.filter(ImageFilter.GaussianBlur(blur))


# ---- YouTube page side (stylized) ---------------------------------------
def youtube_page(page_w, body_h):
    im = Image.new('RGBA', (page_w, body_h), WHITE + (255,))
    d = ImageDraw.Draw(im)

    bar_h = 44

    # Hamburger
    for i in range(3):
        rr(d, 16, 14 + i * 6, 28, 18 + i * 6, 2, fill=INK)

    # YouTube logo
    ps = 22
    ppx, ppy = 44, (bar_h - ps) // 2
    rr(d, ppx - 4, ppy - 4, ppx + ps + 4, ppy + ps + 4, 4, fill=RED)
    d.polygon([(ppx + 4, ppy + 3), (ppx + 4, ppy + ps - 3),
               (ppx + ps - 2, ppy + ps // 2)], fill=WHITE)
    d.text((ppx + ps + 8, ppy - 1), 'YouTube',
           font=font(16, bold=True), fill=INK)

    # Search bar
    sb_w = min(page_w - 380, 380)
    rr(d, 240, 8, 240 + sb_w, 8 + 28, 14,
       fill=WHITE, outline=BORDER, w=1)
    d.text((240 + 16, 8 + 7), 'Search',
           font=font(12, bold=False), fill=INK_FAINT)

    # Avatar + Sign in
    sa_x = page_w - 100
    el(d, sa_x, 10, sa_x + 24, 34,
       fill=CREAM_200, outline=BORDER, w=1)
    d.text((sa_x + 7, 14), 'A', font=font(13, bold=True), fill=INK_MUTED)
    rr(d, sa_x + 32, 11, page_w - 14, 33, 14,
       outline=BORDER, w=1)
    d.text((sa_x + 44, 13), 'Sign in',
           font=font(11, bold=True), fill=BLUE)
    d.line([(0, bar_h), (page_w, bar_h)], fill=BORDER, width=1)

    # Video player
    pl_x, pl_y = 16, bar_h + 14
    pl_w = page_w - 32
    pl_h = int(pl_w * 9 / 16)
    grad = vgrad((pl_w, pl_h), (32, 18, 14), (12, 6, 4))
    mask = Image.new('L', (pl_w, pl_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pl_w, pl_h),
                                           radius=12, fill=255)
    grad.putalpha(mask)
    im.paste(grad, (pl_x, pl_y), grad)
    d = ImageDraw.Draw(im)

    f_title = font(40, bold=True)
    lines = ['The Healing Power', 'of Listening']
    for i, line in enumerate(lines):
        bbox = d.textbbox((0, 0), line, font=f_title)
        tw_ = bbox[2] - bbox[0]
        tx = pl_x + (pl_w - tw_) // 2 - 80
        ty = pl_y + pl_h // 2 - 50 + i * 52
        d.text((tx, ty), line, font=f_title, fill=WHITE)

    ted_x, ted_y = pl_x + 24, pl_y + pl_h - 56
    rr(d, ted_x, ted_y, ted_x + 44, ted_y + 28, 3, fill=TED_RED)
    d.text((ted_x + 6, ted_y + 4), 'TED',
           font=font(15, bold=True), fill=WHITE)

    cx, cy = pl_x + pl_w // 2, pl_y + pl_h // 2 + 8
    d.polygon([(cx - 26, cy - 36), (cx - 26, cy + 36), (cx + 32, cy)],
              outline=(255, 255, 255), width=2)

    # Title + meta row
    by = pl_y + pl_h + 20
    d.text((16, by), "How I'm Helping Thousands Rebuild Their Lives",
           font=font(17, bold=True), fill=INK)
    cr_y = by + 32
    el(d, 16, cr_y, 52, cr_y + 36, fill=TED_RED)
    d.text((20, cr_y + 4), 'T', font=font(18, bold=True), fill=WHITE)
    d.text((62, cr_y + 2), 'TED', font=font(14, bold=True), fill=INK)
    d.text((62, cr_y + 18), '27.8M subscribers',
           font=font(11, bold=False), fill=INK_MUTED)
    btn_y = cr_y + 4
    rr(d, 200, btn_y, 260, btn_y + 28, 14, fill=CREAM_200)
    d.text((218, btn_y + 7), 'Join',
           font=font(12, bold=True), fill=INK)
    rr(d, 266, btn_y, 332, btn_y + 28, 14, fill=INK)
    d.text((280, btn_y + 7), 'Subscribe',
           font=font(12, bold=True), fill=WHITE)

    # Action row + injected button
    ar_y = cr_y + 50
    ax = 16
    sz = 36
    # thumbs up
    rr(d, ax, ar_y, ax + sz, ar_y + sz, 18, fill=CREAM_200)
    d.rounded_rectangle((ax + 14, ar_y + 14, ax + 22, ar_y + 26),
                        radius=2, fill=INK_MUTED)
    d.polygon([(ax + 12, ar_y + 16), (ax + 18, ar_y + 8),
               (ax + 24, ar_y + 16)], fill=INK_MUTED)
    ax += sz + 6
    d.text((ax, ar_y + 11), '283',
           font=font(11, bold=True), fill=INK)
    ax += tw(d, '283', font(11, bold=True)) + 8
    # thumbs down
    rr(d, ax, ar_y, ax + sz, ar_y + sz, 18, fill=CREAM_200)
    d.polygon([(ax + 12, ar_y + 22), (ax + 18, ar_y + 30),
               (ax + 24, ar_y + 22)], fill=INK_MUTED)
    ax += sz + 4

    # Share
    rr(d, ax, ar_y, ax + sz, ar_y + sz, 18, fill=CREAM_200)
    d.polygon([(ax + 12, ar_y + 14), (ax + 22, ar_y + 10),
               (ax + 22, ar_y + 18), (ax + 28, ar_y + 12),
               (ax + 28, ar_y + 24), (ax + 22, ar_y + 18),
               (ax + 22, ar_y + 26), (ax + 12, ar_y + 22)],
              fill=INK_MUTED)
    ax += sz + 4
    d.text((ax, ar_y + 11), 'Share',
           font=font(11, bold=True), fill=INK)
    ax += tw(d, 'Share', font(11, bold=True)) + 8

    # Download
    rr(d, ax, ar_y, ax + sz, ar_y + sz, 18, fill=CREAM_200)
    d.rectangle((ax + 16, ar_y + 12, ax + 20, ar_y + 24), fill=INK_MUTED)
    d.polygon([(ax + 12, ar_y + 18), (ax + 24, ar_y + 18),
               (ax + 18, ar_y + 30)], fill=INK_MUTED)
    ax += sz + 4
    d.text((ax, ar_y + 11), 'Download',
           font=font(11, bold=True), fill=INK)
    ax += tw(d, 'Download', font(11, bold=True)) + 8

    # More
    rr(d, ax, ar_y, ax + sz, ar_y + sz, 18, fill=CREAM_200)
    for i in range(3):
        el(d, ax + 14 + i * 4, ar_y + 16, ax + 18 + i * 4, ar_y + 20,
           fill=INK_MUTED)
    ax += sz + 12

    # OUR INJECTED BUTTON (prominent orange)
    btn_x, btn_y, btn_w, btn_h = ax, ar_y - 1, 220, 38
    rr(d, btn_x, btn_y, btn_x + btn_w, btn_y + btn_h, 19, fill=CLAY)
    bolt(d, btn_x + 24, btn_y + btn_h // 2, 16, WHITE)
    d.text((btn_x + 42, btn_y + 11), 'Summarize with AI',
           font=font(13, bold=True), fill=WHITE)

    # Description card
    desc_y = ar_y + 56
    desc_h = min(72, body_h - desc_y - 8)
    if desc_h > 30:
        rr(d, 16, desc_y, page_w - 16, desc_y + desc_h, 12, fill=CREAM_200)
        d.text((28, desc_y + 12),
               'Susan Burton shares her transformative journey from',
               font=font(11, bold=False), fill=INK)
        d.text((28, desc_y + 28),
               'incarceration and addiction to founding a nationwide',
               font=font(11, bold=False), fill=INK)
        d.text((28, desc_y + 44),
               'support network for formerly incarcerated women.',
               font=font(11, bold=False), fill=INK)

    return im


# ---- Side panel states --------------------------------------------------
def panel(state, video):
    W, H = 400, 800
    im = Image.new('RGBA', (W, H), CREAM + (255,))
    d = ImageDraw.Draw(im)

    # Header
    d.rectangle((0, 0, W, 56), fill=WHITE)
    d.line([(0, 56), (W, 56)], fill=CREAM_300, width=1)
    brand_mark(d, 16, 14, size=28)
    d.text((52, 14), 'YepIts.ai',
           font=font(15, bold=True), fill=INK)
    d.text((52, 32), video['channel'],
           font=font(10, bold=False), fill=INK_MUTED)
    rr(d, W - 90, 16, W - 16, 40, 14, outline=BORDER, w=1)
    d.text((W - 76, 20), 'Sign in',
           font=font(10, bold=True), fill=BLUE)
    d.line([(W - 16, 8), (W - 8, 16)], fill=INK_MUTED, width=2)

    # Video card
    cy = 72
    rr(d, 12, cy, W - 12, cy + 96, 12, fill=WHITE, outline=BORDER, w=1)
    rr(d, 20, cy + 8, 124, cy + 88, 8, fill=(40, 22, 14))
    d.polygon([(66, cy + 38), (66, cy + 58), (82, cy + 48)], fill=WHITE)
    mx = 134
    d.text((mx, cy + 10), video['short_channel'],
           font=font(10, bold=True), fill=TED_RED)
    f_vt = font(12, bold=True)
    d.text((mx, cy + 26), video['short_title'], font=f_vt, fill=INK)
    d.text((mx, cy + 42), video['short_title_2'], font=f_vt, fill=INK)
    d.text((mx, cy + 62), video['duration'],
           font=font(10, bold=False), fill=INK_MUTED)
    if state in ('result', 'result-scroll'):
        pill_text = '3 of 3 left'
        pill_bg = CLAY_SOFT
        pill_fg = CLAY
    elif state == 'limit':
        pill_text = '0 of 3 left'
        pill_bg = WARN_BG
        pill_fg = WARN_FG
    else:
        pill_text = '3 of 3 left'
        pill_bg = CLAY_SOFT
        pill_fg = CLAY
    f_pill = font(10, bold=True)
    pw = tw(d, pill_text, f_pill)
    pill_x = W - pw - 24
    rr(d, pill_x - 6, cy + 66, W - 20, cy + 88, 10, fill=pill_bg)
    d.text((pill_x, cy + 70), pill_text, font=f_pill, fill=pill_fg)

    if state == 'ready':
        cy = 184
        rr(d, 12, cy, W - 12, cy + 48, 12, fill=CLAY)
        bolt(d, 32, cy + 24, 18, WHITE)
        d.text((58, cy + 15), 'Summarize this video',
               font=font(14, bold=True), fill=WHITE)
        d.text((16, cy + 60), 'Free for videos under 10 min',
               font=font(11, bold=False), fill=INK_MUTED)
        hy = cy + 92
        d.text((16, hy), 'RECENT SUMMARIES',
               font=font(10, bold=True), fill=INK_FAINT)
        ih_y = hy + 22
        rr(d, 12, ih_y, W - 12, ih_y + 64, 12,
           fill=WHITE, outline=BORDER, w=1)
        rr(d, 20, ih_y + 8, 92, ih_y + 56, 6, fill=(40, 22, 14))
        d.polygon([(50, ih_y + 26), (50, ih_y + 38), (62, ih_y + 32)],
                  fill=WHITE)
        d.text((100, ih_y + 8), "How I'm Helping Thousands…",
               font=font(11, bold=True), fill=INK)
        d.text((100, ih_y + 24), 'TED · just now',
               font=font(10, bold=False), fill=INK_MUTED)
        d.text((100, ih_y + 42), 'Share',
               font=font(10, bold=True), fill=CLAY)
        d.text((142, ih_y + 42), 'Copy',
               font=font(10, bold=True), fill=CLAY)
        d.text((180, ih_y + 42), 'Sites',
               font=font(10, bold=True), fill=CLAY)

    elif state == 'loading':
        cy = 184
        rr(d, 12, cy, W - 12, cy + 220, 12,
           fill=WHITE, outline=BORDER, w=1)
        d.text((24, cy + 16), 'Cooking up your summary',
               font=font(14, bold=True), fill=INK)
        d.text((24, cy + 36), 'Usually about 8 seconds',
               font=font(10, bold=False), fill=INK_MUTED)
        steps = [
            ('Fetching transcript', True),
            ('Reading the captions', True),
            ('Picking out the good parts', False),
            ('Putting it all together', False),
        ]
        sy = cy + 72
        for i, (label, done) in enumerate(steps):
            cxd = 32
            cyd = sy + i * 32 + 6
            if done:
                el(d, cxd - 10, cyd - 10, cxd + 10, cyd + 10, fill=MOSS)
                d.line([(cxd - 5, cyd), (cxd - 2, cyd + 4),
                        (cxd + 5, cyd - 5)], fill=WHITE, width=2)
            else:
                el(d, cxd - 10, cyd - 10, cxd + 10, cyd + 10,
                   fill=WHITE, outline=BORDER, w=2)
                if i == 2:
                    el(d, cxd - 5, cyd - 5, cxd + 5, cyd + 5, fill=CLAY)
            fc = INK if (done or i == 2) else INK_FAINT
            fb = (done or i == 2)
            d.text((52, sy + i * 32 - 1), label,
                   font=font(12, bold=fb), fill=fc)

    elif state in ('result', 'result-scroll'):
        cy = 184
        d.text((16, cy), 'SUMMARY',
               font=font(10, bold=True), fill=INK_FAINT)
        cy += 18
        body = (
            "Susan Burton shares her transformative journey from "
            "incarceration and addiction to founding a nationwide "
            "support network for formerly incarcerated women. After "
            "losing her five-year-old son to a car accident, Burton "
            "spiraled into substance abuse and cycled through prison "
            "multiple times until she found salvation in Alcoholics "
            "Anonymous in 1997, where compassionate listening changed "
            "her life."
        )
        f_body = font(12, bold=False)
        max_w = W - 32
        words = body.split()
        line = ''
        lines = []
        for w_ in words:
            test = (line + ' ' + w_).strip()
            if tw(d, test, f_body) > max_w:
                lines.append(line)
                line = w_
            else:
                line = test
        if line:
            lines.append(line)
        if state == 'result':
            visible = lines[:9]
        else:
            visible = lines[7:]
        for i, ln in enumerate(visible):
            d.text((16, cy + i * 18), ln, font=f_body, fill=INK)

        # Takeaways + timestamps (always below)
        tby = cy + len(visible) * 18 + 18
        d.text((16, tby), 'KEY TAKEAWAYS',
               font=font(10, bold=True), fill=INK_FAINT)
        tby += 18
        takeaways = [
            'Listening is the most powerful gift.',
            'Compassion breaks the cycle.',
            'Recovery is rarely a straight line.',
        ]
        for i, t in enumerate(takeaways):
            el(d, 16, tby + 4 + i * 22, 22, tby + 10 + i * 22, fill=CLAY)
            d.text((28, tby + i * 22), t,
                   font=font(11, bold=False), fill=INK)

        tsy = tby + len(takeaways) * 22 + 8
        d.text((16, tsy), 'TIMESTAMPS',
               font=font(10, bold=True), fill=INK_FAINT)
        tsy += 18
        timestamps = [
            ('00:42', 'Losing her son'),
            ('03:18', 'Finding AA'),
            ('07:55', 'Building the network'),
            ('11:20', 'Why listening works'),
        ]
        for i, (t, lbl) in enumerate(timestamps):
            row_y = tsy + i * 28
            rr(d, 12, row_y, W - 12, row_y + 24, 8, fill=CREAM_200)
            d.text((20, row_y + 5), t,
                   font=font(11, bold=True), fill=CLAY)
            d.text((76, row_y + 5), lbl,
                   font=font(11, bold=False), fill=INK)

    elif state == 'limit':
        cy = 184
        rr(d, 12, cy, W - 12, cy + 240, 12,
           fill=WHITE, outline=BORDER, w=1)
        d.text((24, cy + 24), "You've hit today's free limit",
               font=font(14, bold=True), fill=INK)
        d.text((24, cy + 48), '3 of 3 summaries used. Resets at midnight.',
               font=font(11, bold=False), fill=INK_MUTED)
        pb_x, pb_y, pb_w, pb_h = 24, cy + 88, W - 48, 10
        rr(d, pb_x, pb_y, pb_x + pb_w, pb_y + pb_h, 5, fill=CREAM_200)
        rr(d, pb_x, pb_y, pb_x + pb_w, pb_y + pb_h, 5, fill=CLAY)
        sby = cy + 116
        rr(d, 24, sby, W - 24, sby + 40, 10, fill=CLAY)
        d.text((W // 2 - 70, sby + 12), 'Sign in to keep going',
               font=font(13, bold=True), fill=WHITE)
        pby = sby + 52
        rr(d, 24, pby, W - 24, pby + 56, 10, fill=CREAM_200)
        d.text((36, pby + 10), 'Go Pro',
               font=font(13, bold=True), fill=INK)
        d.text((36, pby + 30), 'Unlimited summaries, $7 / month',
               font=font(11, bold=False), fill=INK_MUTED)

    # Footer
    d.text((16, H - 22), 'Made with care  \u00b7  yepits.ai',
           font=font(10, bold=False), fill=INK_FAINT)
    return im


# ---- Compose 1280x800 ---------------------------------------------------
def screenshot(state, title, badge):
    W, H = 1280, 800
    pad = 24
    bar_h = 36
    body_top = bar_h + pad
    body_bot = H - 76
    body_h = body_bot - body_top
    page_w, panel_w = 720, 460
    inner = page_w + pad + panel_w
    pad_eff_x = (W - inner) // 2
    page_x = pad_eff_x
    panel_x = page_x + page_w + pad

    bg = vgrad((W, H), CREAM, CREAM_200).convert('RGBA')
    d = ImageDraw.Draw(bg)

    # Chrome title bar
    d.rectangle((0, 0, W, bar_h), fill=(245, 245, 245))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        cx = 18 + i * 22
        d.ellipse((cx - 6, bar_h // 2 - 6, cx + 6, bar_h // 2 + 6), fill=c)
    pill_w = 480
    pill_cx = page_x + page_w // 2
    pill_x = pill_cx - pill_w // 2
    pill_y = (bar_h - 24) // 2
    rr(d, pill_x, pill_y, pill_x + pill_w, pill_y + 24, 12,
       fill=WHITE, outline=(220, 220, 220), w=1)
    url = 'youtube.com  \u203a  watch'
    uw = tw(d, url, font(12, bold=False))
    d.text((pill_x + (pill_w - uw) // 2, pill_y + 5),
           url, font=font(12, bold=False), fill=INK_MUTED)

    # Render page + panel
    page_im = youtube_page(page_w, body_h)
    video = {
        'channel': 'TED Talks',
        'short_channel': 'TED',
        'short_title': "How I'm Helping Thousands Rebuild",
        'short_title_2': 'Their Lives After Prison',
        'duration': '13:46',
    }
    panel_im = panel(state, video)

    # Round masks (match the rendered image sizes)
    pw_px, ph_px = page_im.size
    m1 = Image.new('L', (pw_px, ph_px), 0)
    ImageDraw.Draw(m1).rounded_rectangle(
        (0, 0, pw_px, ph_px), radius=14, fill=255)
    page_im.putalpha(m1)
    pw2, ph2 = panel_im.size
    m2 = Image.new('L', (pw2, ph2), 0)
    ImageDraw.Draw(m2).rounded_rectangle(
        (0, 0, pw2, ph2), radius=14, fill=255)
    panel_im.putalpha(m2)

    sh_p = shadow(page_w, body_h, radius=14)
    sh_pn = shadow(panel_w, body_h, radius=14)
    bg.alpha_composite(sh_p, (page_x - 12, body_top - 12))
    bg.alpha_composite(page_im, (page_x, body_top))
    bg.alpha_composite(sh_pn, (panel_x - 12, body_top - 12))
    bg.alpha_composite(panel_im, (panel_x, body_top))

    # Caption strip
    d = ImageDraw.Draw(bg)
    cap_y = body_bot + 18
    brand_mark(d, pad_eff_x, cap_y, size=30)
    d.text((pad_eff_x + 38, cap_y - 1), 'YepIts.ai',
           font=font(19, bold=True), fill=INK)
    d.text((pad_eff_x + 38, cap_y + 18), title,
           font=font(13, bold=False), fill=INK_MUTED)
    f_pill = font(11, bold=True)
    pw = tw(d, badge, f_pill)
    bx0 = W - pad_eff_x - pw - 28
    by0 = cap_y + 4
    rr(d, bx0, by0, bx0 + pw + 28, by0 + 26, 13, fill=CLAY_SOFT)
    d.text((bx0 + 14, by0 + 7), badge,
           font=f_pill, fill=CLAY)

    return bg.convert('RGB')


# ---- Promo tile 440x280 -------------------------------------------------
def promo_tile():
    W, H = 440, 280
    im = vgrad((W, H), CREAM, CREAM_200).convert('RGBA')
    d = ImageDraw.Draw(im)
    brand_mark(d, 36, (H - 96) // 2, size=96)
    d.text((152, 56), 'YepIts.ai',
           font=font(34, bold=True), fill=INK)
    d.text((152, 104), 'Summarize any YouTube',
           font=font(16, bold=False), fill=INK)
    d.text((152, 126), 'video in seconds.',
           font=font(16, bold=False), fill=INK)
    meta = 'Free  \u00b7  3 summaries / day  \u00b7  No account'
    mw = tw(d, meta, font(11, bold=False))
    d.text(((W - mw) // 2, H - 30), meta,
           font=font(11, bold=False), fill=INK_MUTED)
    return im.convert('RGB')


# ---- Marquee 1400x560 ---------------------------------------------------
def marquee():
    W, H = 1400, 560
    im = vgrad((W, H), CREAM, CREAM_200).convert('RGBA')
    d = ImageDraw.Draw(im)
    brand_mark(d, 80, 80, size=96)
    d.text((196, 96), 'YepIts.ai',
           font=font(56, bold=True), fill=INK)
    d.text((80, 200), 'Turn any YouTube video',
           font=font(34, bold=True), fill=INK)
    d.text((80, 244), 'into a 2-minute read.',
           font=font(34, bold=True), fill=INK)
    d.text((80, 320), 'Key takeaways, clickable timestamps,',
           font=font(18, bold=False), fill=INK_MUTED)
    d.text((80, 346), 'and a shareable page — right in Chrome.',
           font=font(18, bold=False), fill=INK_MUTED)
    fcta = font(15, bold=True)
    cta = 'Install free'
    cw = tw(d, cta, fcta)
    rr(d, 80, 410, 80 + cw + 40, 410 + 44, 22, fill=CLAY)
    d.text((100, 422), cta, font=fcta, fill=WHITE)

    video = {
        'channel': 'TED Talks',
        'short_channel': 'TED',
        'short_title': "How I'm Helping Thousands Rebuild",
        'short_title_2': 'Their Lives After Prison',
        'duration': '13:46',
    }
    panel_w, panel_h = 380, 460
    panel_x, panel_y = W - panel_w - 80, 50
    pn = panel('result', video).resize((panel_w, panel_h))
    sh = shadow(panel_w, panel_h)
    im.alpha_composite(sh, (panel_x - 12, panel_y - 12))
    im.alpha_composite(pn, (panel_x, panel_y))
    return im.convert('RGB')


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'dist/store'
    os.makedirs(out, exist_ok=True)
    shots = [
        ('result',        '01-summary.png',   'Summary at a glance',     'FREE \u00b7 NO ACCOUNT'),
        ('result-scroll', '02-takeaways.png', 'Takeaways + timestamps',  'CLICK TO SEEK'),
        ('ready',         '03-ready.png',     'One click to summarize',  '3 FREE / DAY'),
        ('loading',       '04-loading.png',   'Average 8 seconds',       'YOU CAN BREATHE'),
        ('limit',         '05-limit.png',     'Hit the limit? Go Pro',   '$7 / MONTH'),
    ]
    for state, fname, title, badge in shots:
        im = screenshot(state, title, badge)
        p = os.path.join(out, fname)
        im.save(p, optimize=True)
        print(f'wrote {p} ({im.size[0]}x{im.size[1]})')

    p = promo_tile()
    path = os.path.join(out, 'promo-440x280.png')
    p.save(path, optimize=True)
    print(f'wrote {path} ({p.size[0]}x{p.size[1]})')

    m = marquee()
    path = os.path.join(out, 'marquee-1400x560.png')
    m.save(path, optimize=True)
    print(f'wrote {path} ({m.size[0]}x{m.size[1]})')


if __name__ == '__main__':
    main()
