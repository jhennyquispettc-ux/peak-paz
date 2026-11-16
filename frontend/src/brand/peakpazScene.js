var PP_COLORS = { base: '#3B2416', cream: '#FBF4EA', orange: '#F77F00', amber: '#FCA311', sun: '#FFD166', flag: '#A3284B' };
var PP_GROUND = [[20, 200], [70, 188], [110, 174], [150, 157], [188, 137], [226, 137], [258, 160], [300, 200]];
var PP_NS = 'http://www.w3.org/2000/svg';
var PP_WORD = '<path d="M194.34 66.92Q187.74 66.92 182.69 64.32Q177.64 61.72 174.78 57.07Q171.92 52.42 171.92 46.44Q171.92 40.52 174.71 35.91Q177.50 31.30 182.35 28.63Q187.20 25.96 193.26 25.96Q199.22 25.96 203.79 28.47Q208.36 30.98 210.96 35.42Q213.56 39.86 213.56 45.56Q213.56 46.7 213.44 47.94Q213.32 49.18 212.96 50.8L178.44 50.98V41.98L207.44 41.8L201.16 45.7Q201.12 42.42 200.25 40.29Q199.38 38.16 197.69 37.06Q196.00 35.96 193.46 35.96Q190.82 35.96 188.88 37.22Q186.94 38.48 185.91 40.81Q184.88 43.14 184.88 46.44Q184.88 49.8 185.99 52.13Q187.10 54.46 189.20 55.67Q191.30 56.88 194.32 56.88Q197.16 56.88 199.38 55.93Q201.60 54.98 203.36 52.98L210.64 60.22Q207.72 63.56 203.60 65.24Q199.48 66.92 194.34 66.92Z M235.16 66.8Q229.72 66.8 225.49 64.16Q221.26 61.52 218.85 56.94Q216.44 52.36 216.44 46.46Q216.44 40.54 218.85 35.93Q221.26 31.32 225.49 28.7Q229.72 26.08 235.16 26.08Q238.84 26.08 241.88 27.42Q244.92 28.76 246.89 31.14Q248.86 33.52 249.28 36.60V56.28Q248.86 59.36 246.90 61.74Q244.94 64.12 241.89 65.46Q238.84 66.8 235.16 66.8ZM238.16 54.4Q241.60 54.4 243.70 52.17Q245.80 49.94 245.80 46.44Q245.80 44.08 244.86 42.31Q243.92 40.54 242.20 39.51Q240.48 38.48 238.22 38.48Q235.98 38.48 234.26 39.51Q232.54 40.54 231.53 42.34Q230.52 44.14 230.52 46.44Q230.52 48.74 231.50 50.54Q232.48 52.34 234.23 53.37Q235.98 54.4 238.16 54.4ZM245.30 66.0V55.5L247.30 45.96L245.30 36.5V26.88H258.96V66.0Z M292.20 66.0 279.92 45.56 292.12 26.88H307.40L292.20 47.94L292.60 42.84L308.20 66.0ZM267.08 66.0V7.68H281.04V66.0Z M376.68 66.8Q371.24 66.8 367.01 64.16Q362.78 61.52 360.37 56.94Q357.96 52.36 357.96 46.46Q357.96 40.54 360.37 35.93Q362.78 31.32 367.01 28.7Q371.24 26.08 376.68 26.08Q380.36 26.08 383.40 27.42Q386.44 28.76 388.41 31.14Q390.38 33.52 390.80 36.60V56.28Q390.38 59.36 388.42 61.74Q386.46 64.12 383.41 65.46Q380.36 66.8 376.68 66.8ZM379.68 54.4Q383.12 54.4 385.22 52.17Q387.32 49.94 387.32 46.44Q387.32 44.08 386.38 42.31Q385.44 40.54 383.72 39.51Q382.00 38.48 379.74 38.48Q377.50 38.48 375.78 39.51Q374.06 40.54 373.05 42.34Q372.04 44.14 372.04 46.44Q372.04 48.74 373.02 50.54Q374.00 52.34 375.75 53.37Q377.50 54.4 379.68 54.4ZM386.82 66.0V55.5L388.82 45.96L386.82 36.5V26.88H400.48V66.0Z M406.32 57.66 424.88 35.22H442.04L423.48 57.66ZM406.32 66.0V57.66L415.34 54.64H441.56V66.0ZM407.70 38.24V26.88H442.04V35.22L433.02 38.24Z" fill="currentColor"/><g fill="currentColor"><g transform="translate(103.08 -22.78) scale(1.07)"><path d="M22 46H34V98.7L22 104Z"/><path d="M28 52H42a13 13 0 0 1 0 26H28" fill="none" stroke="currentColor" stroke-width="12"/></g> <g transform="translate(288.92 -22.78) scale(1.07)"><path d="M22 46H34V98.7L22 104Z"/><path d="M28 52H42a13 13 0 0 1 0 26H28" fill="none" stroke="currentColor" stroke-width="12"/></g></g>';
var PP_TAG = 'M133.91 114.22Q132.24 114.22 130.82 113.62Q129.40 113.01 128.35 111.92Q127.29 110.83 126.72 109.39Q126.15 107.95 126.15 106.3Q126.15 104.65 126.72 103.21Q127.29 101.77 128.35 100.69Q129.40 99.61 130.82 99.00Q132.24 98.38 133.91 98.38Q135.78 98.38 137.15 99.00Q138.51 99.61 139.57 100.67L137.85 102.38Q137.17 101.64 136.19 101.22Q135.21 100.8 133.91 100.8Q132.77 100.8 131.82 101.20Q130.88 101.59 130.18 102.33Q129.49 103.07 129.12 104.08Q128.74 105.09 128.74 106.3Q128.74 107.51 129.12 108.52Q129.49 109.53 130.18 110.27Q130.88 111.01 131.82 111.40Q132.77 111.8 133.91 111.8Q135.32 111.8 136.30 111.37Q137.28 110.94 137.96 110.19L139.68 111.91Q138.62 112.99 137.19 113.60Q135.76 114.22 133.91 114.22Z M146.04 114.22Q144.61 114.22 143.46 113.49Q142.30 112.77 141.63 111.53Q140.96 110.28 140.96 108.74Q140.96 107.18 141.63 105.94Q142.30 104.69 143.46 103.96Q144.61 103.22 146.04 103.22Q147.25 103.22 148.19 103.74Q149.12 104.25 149.67 105.16Q150.22 106.06 150.22 107.20V110.24Q150.22 111.38 149.69 112.28Q149.15 113.19 148.20 113.70Q147.25 114.22 146.04 114.22ZM146.44 111.93Q147.78 111.93 148.61 111.03Q149.43 110.13 149.43 108.72Q149.43 107.77 149.06 107.05Q148.68 106.32 148.01 105.91Q147.34 105.51 146.44 105.51Q145.56 105.51 144.89 105.91Q144.22 106.32 143.83 107.05Q143.45 107.77 143.45 108.72Q143.45 109.67 143.83 110.39Q144.22 111.12 144.89 111.53Q145.56 111.93 146.44 111.93ZM149.28 114.0V111.16L149.70 108.59L149.28 106.04V103.44H151.70V114.0Z M154.39 114.0V103.44H156.81V114.0ZM161.41 114.0V107.71Q161.41 106.65 160.75 106.07Q160.09 105.49 159.12 105.49Q158.46 105.49 157.95 105.75Q157.43 106.01 157.12 106.51Q156.81 107.00 156.81 107.71L155.87 107.18Q155.87 105.97 156.40 105.09Q156.92 104.21 157.83 103.72Q158.73 103.22 159.85 103.22Q160.97 103.22 161.87 103.70Q162.78 104.19 163.30 105.07Q163.83 105.95 163.83 107.18V114.0ZM168.43 114.0V107.71Q168.43 106.65 167.77 106.07Q167.11 105.49 166.14 105.49Q165.50 105.49 164.98 105.75Q164.45 106.01 164.14 106.51Q163.83 107.00 163.83 107.71L162.47 107.18Q162.58 105.97 163.17 105.09Q163.77 104.21 164.70 103.72Q165.64 103.22 166.76 103.22Q167.90 103.22 168.83 103.70Q169.75 104.19 170.30 105.07Q170.85 105.95 170.85 107.18V114.0Z M173.37 114.0V103.44H175.79V114.0ZM174.58 101.50Q173.96 101.50 173.56 101.09Q173.15 100.67 173.15 100.05Q173.15 99.44 173.56 99.02Q173.96 98.6 174.58 98.6Q175.22 98.6 175.61 99.02Q176.01 99.44 176.01 100.05Q176.01 100.67 175.61 101.09Q175.22 101.50 174.58 101.50Z M185.74 114.0V107.91Q185.74 106.85 185.07 106.17Q184.40 105.49 183.35 105.49Q182.64 105.49 182.09 105.79Q181.54 106.10 181.23 106.65Q180.93 107.20 180.93 107.91L179.98 107.38Q179.98 106.17 180.51 105.23Q181.04 104.30 181.97 103.76Q182.90 103.22 184.08 103.22Q185.26 103.22 186.18 103.83Q187.11 104.43 187.64 105.39Q188.16 106.34 188.16 107.38V114.0ZM178.51 114.0V103.44H180.93V114.0Z M195.06 114.22Q193.63 114.22 192.48 113.49Q191.32 112.77 190.65 111.53Q189.98 110.28 189.98 108.74Q189.98 107.18 190.65 105.94Q191.32 104.69 192.48 103.96Q193.63 103.22 195.06 103.22Q196.27 103.22 197.21 103.74Q198.14 104.25 198.69 105.16Q199.24 106.06 199.24 107.20V110.24Q199.24 111.38 198.70 112.28Q198.16 113.19 197.22 113.70Q196.27 114.22 195.06 114.22ZM195.46 111.93Q196.80 111.93 197.62 111.03Q198.45 110.13 198.45 108.72Q198.45 107.77 198.07 107.05Q197.70 106.32 197.03 105.91Q196.36 105.51 195.46 105.51Q194.58 105.51 193.91 105.91Q193.23 106.32 192.85 107.05Q192.46 107.77 192.46 108.72Q192.46 109.67 192.85 110.39Q193.23 111.12 193.91 111.53Q194.58 111.93 195.46 111.93ZM198.29 114.0V111.16L198.71 108.59L198.29 106.04V103.44H200.71V114.0Z M210.65 114.0V107.91Q210.65 106.85 209.98 106.17Q209.31 105.49 208.26 105.49Q207.54 105.49 206.99 105.79Q206.45 106.10 206.14 106.65Q205.83 107.20 205.83 107.91L204.88 107.38Q204.88 106.17 205.41 105.23Q205.94 104.30 206.87 103.76Q207.81 103.22 208.98 103.22Q210.16 103.22 211.09 103.83Q212.01 104.43 212.54 105.39Q213.07 106.34 213.07 107.38V114.0ZM203.41 114.0V103.44H205.83V114.0Z M219.96 114.22Q218.53 114.22 217.38 113.49Q216.23 112.77 215.56 111.53Q214.88 110.28 214.88 108.74Q214.88 107.17 215.55 105.93Q216.22 104.69 217.38 103.96Q218.53 103.22 219.96 103.22Q221.17 103.22 222.11 103.74Q223.04 104.25 223.59 105.16Q224.14 106.06 224.14 107.20V110.24Q224.14 111.38 223.61 112.28Q223.07 113.19 222.12 113.70Q221.17 114.22 219.96 114.22ZM220.36 111.93Q221.26 111.93 221.93 111.52Q222.60 111.11 222.98 110.39Q223.35 109.67 223.35 108.72Q223.35 107.77 222.97 107.05Q222.60 106.33 221.93 105.92Q221.26 105.51 220.37 105.51Q219.48 105.51 218.81 105.92Q218.14 106.33 217.76 107.05Q217.37 107.78 217.37 108.72Q217.37 109.67 217.75 110.39Q218.14 111.12 218.81 111.52Q219.49 111.93 220.36 111.93ZM225.62 114.0H223.20V111.16L223.62 108.59L223.20 106.04V98.16H225.62Z M233.15 114.22Q231.61 114.22 230.36 113.48Q229.11 112.75 228.37 111.49Q227.63 110.24 227.63 108.70Q227.63 107.16 228.37 105.93Q229.11 104.69 230.36 103.96Q231.61 103.22 233.15 103.22Q234.72 103.22 235.97 103.95Q237.22 104.67 237.96 105.91Q238.70 107.16 238.70 108.70Q238.70 110.24 237.96 111.49Q237.22 112.75 235.97 113.48Q234.72 114.22 233.15 114.22ZM233.15 111.89Q234.06 111.89 234.75 111.48Q235.44 111.07 235.83 110.35Q236.21 109.62 236.21 108.70Q236.21 107.77 235.82 107.07Q235.42 106.37 234.74 105.96Q234.06 105.55 233.15 105.55Q232.27 105.55 231.58 105.96Q230.89 106.37 230.50 107.07Q230.12 107.77 230.12 108.70Q230.12 109.62 230.50 110.35Q230.89 111.07 231.58 111.48Q232.27 111.89 233.15 111.89Z M249.98 114.22Q248.42 114.22 247.16 113.49Q245.89 112.77 245.17 111.51Q244.44 110.26 244.44 108.72Q244.44 107.16 245.17 105.91Q245.89 104.67 247.16 103.95Q248.42 103.22 249.98 103.22Q251.22 103.22 252.28 103.69Q253.35 104.17 254.10 105.05L252.51 106.65Q252.05 106.10 251.40 105.83Q250.75 105.55 249.98 105.55Q249.08 105.55 248.39 105.96Q247.70 106.37 247.31 107.07Q246.93 107.77 246.93 108.72Q246.93 109.64 247.31 110.36Q247.70 111.07 248.39 111.48Q249.08 111.89 249.98 111.89Q250.75 111.89 251.40 111.61Q252.05 111.34 252.51 110.79L254.10 112.39Q253.35 113.27 252.28 113.75Q251.22 114.22 249.98 114.22Z M260.69 114.22Q259.15 114.22 257.89 113.48Q256.64 112.75 255.90 111.49Q255.16 110.24 255.16 108.70Q255.16 107.16 255.90 105.93Q256.64 104.69 257.89 103.96Q259.15 103.22 260.69 103.22Q262.25 103.22 263.50 103.95Q264.76 104.67 265.49 105.91Q266.23 107.16 266.23 108.70Q266.23 110.24 265.49 111.49Q264.76 112.75 263.50 113.48Q262.25 114.22 260.69 114.22ZM260.69 111.89Q261.59 111.89 262.28 111.48Q262.97 111.07 263.36 110.35Q263.74 109.62 263.74 108.70Q263.74 107.77 263.35 107.07Q262.95 106.37 262.27 105.96Q261.59 105.55 260.69 105.55Q259.81 105.55 259.11 105.96Q258.42 106.37 258.04 107.07Q257.65 107.77 257.65 108.70Q257.65 109.62 258.04 110.35Q258.42 111.07 259.11 111.48Q259.81 111.89 260.69 111.89Z M275.48 114.0V107.91Q275.48 106.85 274.81 106.17Q274.14 105.49 273.09 105.49Q272.37 105.49 271.83 105.79Q271.28 106.10 270.97 106.65Q270.66 107.20 270.66 107.91L269.72 107.38Q269.72 106.17 270.25 105.23Q270.77 104.30 271.71 103.76Q272.64 103.22 273.82 103.22Q275.00 103.22 275.92 103.83Q276.85 104.43 277.37 105.39Q277.90 106.34 277.90 107.38V114.0ZM268.24 114.0V103.44H270.66V114.0Z M289.21 114.22Q287.78 114.22 286.62 113.49Q285.47 112.77 284.80 111.53Q284.13 110.28 284.13 108.74Q284.13 107.18 284.80 105.94Q285.47 104.69 286.62 103.96Q287.78 103.22 289.21 103.22Q290.42 103.22 291.35 103.74Q292.29 104.25 292.84 105.16Q293.39 106.06 293.39 107.20V110.24Q293.39 111.38 292.85 112.28Q292.31 113.19 291.37 113.70Q290.42 114.22 289.21 114.22ZM289.61 111.93Q290.95 111.93 291.77 111.03Q292.60 110.13 292.60 108.72Q292.60 107.77 292.22 107.05Q291.85 106.32 291.18 105.91Q290.51 105.51 289.61 105.51Q288.73 105.51 288.05 105.91Q287.38 106.32 287.00 107.05Q286.61 107.77 286.61 108.72Q286.61 109.67 287.00 110.39Q287.38 111.12 288.05 111.53Q288.73 111.93 289.61 111.93ZM292.44 114.0V111.16L292.86 108.59L292.44 106.04V103.44H294.86V114.0Z M297.56 114.0V98.16H299.98V114.0Z M304.28 114.0V99.04H306.70V114.0ZM301.75 105.64V103.44H309.23V105.64Z M315.33 114.22Q314.00 114.22 312.95 113.63Q311.90 113.03 311.32 111.99Q310.74 110.95 310.74 109.58V103.44H313.16V109.47Q313.16 110.24 313.41 110.78Q313.66 111.32 314.16 111.60Q314.65 111.89 315.34 111.89Q316.39 111.89 316.95 111.26Q317.51 110.63 317.51 109.47V103.44H319.93V109.58Q319.93 110.96 319.35 112.01Q318.77 113.05 317.73 113.64Q316.69 114.22 315.33 114.22Z M322.39 114.0V103.44H324.81V114.0ZM324.81 108.13 323.97 107.71Q323.97 105.71 324.86 104.46Q325.75 103.22 327.56 103.22Q328.35 103.22 328.99 103.51Q329.62 103.79 330.17 104.43L328.59 106.06Q328.30 105.75 327.95 105.62Q327.60 105.49 327.14 105.49Q326.13 105.49 325.47 106.12Q324.81 106.76 324.81 108.13Z M336.17 114.22Q334.74 114.22 333.58 113.49Q332.43 112.77 331.76 111.53Q331.09 110.28 331.09 108.74Q331.09 107.18 331.76 105.94Q332.43 104.69 333.58 103.96Q334.74 103.22 336.17 103.22Q337.38 103.22 338.31 103.74Q339.25 104.25 339.80 105.16Q340.35 106.06 340.35 107.20V110.24Q340.35 111.38 339.81 112.28Q339.27 113.19 338.32 113.70Q337.38 114.22 336.17 114.22ZM336.56 111.93Q337.91 111.93 338.73 111.03Q339.56 110.13 339.56 108.72Q339.56 107.77 339.18 107.05Q338.81 106.32 338.14 105.91Q337.47 105.51 336.56 105.51Q335.68 105.51 335.01 105.91Q334.34 106.32 333.96 107.05Q333.57 107.77 333.57 108.72Q333.57 109.67 333.96 110.39Q334.34 111.12 335.01 111.53Q335.68 111.93 336.56 111.93ZM339.40 114.0V111.16L339.82 108.59L339.40 106.04V103.44H341.82V114.0Z';
var PP_LOCK = { k: 0.6192, x: 20, y: 205.3, iso: { s: 0.5739, tx: 19.79, ty: 197.01 }, width: 452.16 };

function ppGroundY(x) {
  for (var i = 0; i < PP_GROUND.length - 1; i++) {
    var a = PP_GROUND[i], b = PP_GROUND[i + 1];
    if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  return 200;
}
function ppClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function ppProgress(t, a, b) { return ppClamp((t - a) / (b - a), 0, 1); }
function ppEase(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
function ppLerp(a, b, t) { return a + (b - a) * t; }
function ppMix(c1, c2, t) {
  var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  var r = Math.round(ppLerp(a >> 16, b >> 16, t)), g = Math.round(ppLerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(ppLerp(a & 255, b & 255, t));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

function ppEl(tag, attrs, parent) {
  var e = document.createElementNS(PP_NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function ppFigure(parent, withCap) {
  var g = ppEl('g', {}, parent);
  function limb(w, h) {
    var lg = ppEl('g', {}, g);
    ppEl('rect', { x: -w / 2, y: 0, width: w, height: h, rx: w / 2 }, lg);
    return lg;
  }
  var legBack = limb(5.2, 22), armBack = limb(4.4, 17);
  ppEl('rect', { x: -13, y: -42, width: 9, height: 17, rx: 3 }, g);
  ppEl('circle', { cx: -8.5, cy: -44, r: 3.6 }, g);
  ppEl('rect', { x: -5, y: -43, width: 10, height: 23, rx: 3.5 }, g);
  ppEl('circle', { cx: 1, cy: -50, r: 6 }, g);
  if (withCap) ppEl('rect', { x: -3, y: -56.5, width: 12, height: 3, rx: 1.5 }, g);
  var legFront = limb(5.2, 22), armFront = limb(4.4, 17);
  return { g: g, lb: legBack, lf: legFront, ab: armBack, af: armFront };
}

function ppLetter(parent, second) {
  var g = ppEl('g', {}, parent);
  var pack = ppEl('rect', second ? { x: 63, y: 26, width: 15, height: 29, rx: 5 } : { x: 9, y: 50, width: 15, height: 29, rx: 5 }, g);
  var stem = ppEl('path', { d: second ? 'M76 22H88V74.7L76 80Z' : 'M22 46H34V98.7L22 104Z' }, g);
  var bowl = ppEl('path', { d: second ? 'M82 28H96a13 13 0 0 1 0 26H82' : 'M28 52H42a13 13 0 0 1 0 26H28', fill: 'none', 'stroke-width': 12 }, g);
  return { g: g, pack: pack, stem: stem, bowl: bowl };
}

function ppPut(f, x, dy, facing, leg, armF, armB) {
  f.g.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + (ppGroundY(x) + dy).toFixed(2) + ') scale(' + facing + ' 1)');
  f.lf.setAttribute('transform', 'translate(0 -22) rotate(' + leg.toFixed(1) + ')');
  f.lb.setAttribute('transform', 'translate(0 -22) rotate(' + (-leg).toFixed(1) + ')');
  f.af.setAttribute('transform', 'translate(1 -38) rotate(' + armF.toFixed(1) + ')');
  f.ab.setAttribute('transform', 'translate(1 -38) rotate(' + armB.toFixed(1) + ')');
}

function ppWalk(q, x0, dist) {
  var amp = 26 * Math.min(1, q * 8, (1 - q) * 8);
  var ph = (dist * q) / 5;
  var leg = amp * Math.sin(ph);
  return { x: x0 + dist * q, leg: leg, armF: -leg * 0.8, armB: leg * 0.8, bob: -1.6 * Math.abs(Math.sin(ph)) * Math.min(1, amp / 26) };
}

function ppCelebrate(t) {
  var c = ppEase(ppProgress(t, 4.15, 4.4));
  var jump = t < 4.9 ? -8 * Math.sin(Math.PI * ppProgress(t, 4.35, 4.85)) : -4 * Math.sin(Math.PI * ppProgress(t, 4.95, 5.3));
  return { armF: -165 * c, armB: 165 * c, dy: jump, leg: -jump * 1.3 };
}

export function createPeakPazScene(svg, opts) {
  opts = opts || {};
  var variant = opts.variant || 'full';
  var showTag = opts.tagline !== false;
  var C = PP_COLORS;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', '0 0 320 290');
  var uid = 'pp' + Math.random().toString(36).slice(2, 8);
  var defs = ppEl('defs', {}, svg);
  var clip = ppEl('clipPath', { id: uid + 's' }, defs);
  ppEl('rect', { width: 320, height: 199.4 }, clip);
  var wipe = ppEl('clipPath', { id: uid + 'w' }, defs);
  var wipeRect = ppEl('rect', { x: 0, y: -20, width: 0, height: 200 }, wipe);
  ppEl('rect', { width: 320, height: 290, fill: C.base }, svg);

  var cam = ppEl('g', {}, svg);
  var sunGroup = ppEl('g', { 'clip-path': 'url(#' + uid + 's)' }, cam);
  var rings = [
    ppEl('circle', { cx: 160, cy: 200, r: 150, fill: C.orange }, sunGroup),
    ppEl('circle', { cx: 160, cy: 200, r: 120, fill: C.amber }, sunGroup),
    ppEl('circle', { cx: 160, cy: 200, r: 90, fill: C.sun }, sunGroup)
  ];
  ppEl('path', { d: 'M20 200 L70 188 L110 174 L150 157 L188 137 L226 137 L258 160 L300 200 Z', fill: C.base }, cam);
  var flag = ppEl('g', { opacity: 0 }, cam);
  var flagPole = ppEl('g', {}, flag);
  ppEl('rect', { x: -1.5, y: -46, width: 3, height: 46, rx: 1.3, fill: C.base }, flagPole);
  ppEl('circle', { cx: 0, cy: -47, r: 2.5, fill: C.base }, flagPole);
  var flagCloth = ppEl('path', { fill: C.flag }, flag);
  var people = ppEl('g', { fill: C.base }, cam);
  var guide = ppFigure(people, true);
  var tourist = ppFigure(people, false);

  var iso = null, p1 = null, p2 = null, lock = null, wordG = null, tagG = null;
  if (variant === 'full') {
    iso = ppEl('g', { opacity: 0 }, svg);
    p1 = ppLetter(iso, false);
    p2 = ppLetter(iso, true);
    lock = ppEl('g', { transform: 'translate(' + PP_LOCK.x + ' ' + PP_LOCK.y + ') scale(' + PP_LOCK.k + ')' }, svg);
    wordG = ppEl('g', { 'clip-path': 'url(#' + uid + 'w)', style: 'color:' + C.cream }, lock);
    wordG.innerHTML = PP_WORD;
    if (showTag) {
      tagG = ppEl('path', { d: PP_TAG, fill: C.sun, opacity: 0 }, lock);
    }
  }

  function scaleRing(e, s) {
    e.setAttribute('transform', 'translate(160 200) scale(' + s.toFixed(3) + ') translate(-160 -200)');
  }

  var CX = 207, CY = 112;
  function camXY(x, y, Z, p) {
    return [CX + Z * (x - CX) + p * (160 - CX), CY + Z * (y - CY) + p * (150 - CY)];
  }

  function paintIso(ink, pack) {
    [p1, p2].forEach(function (l) {
      l.stem.setAttribute('fill', ink);
      l.bowl.setAttribute('stroke', ink);
      l.pack.setAttribute('fill', pack);
    });
  }

  function renderFull(t) {
    scaleRing(rings[0], ppEase(ppProgress(t, 0, 0.9)));
    scaleRing(rings[1], ppEase(ppProgress(t, 0.15, 1.05)));
    scaleRing(rings[2], ppEase(ppProgress(t, 0.3, 1.2)));
    var w, r, b, c;
    if (t < 2.5) {
      w = ppWalk(ppProgress(t, 0.7, 2.4), 140, 72);
      ppPut(guide, w.x, w.bob, 1, w.leg, w.armF, w.armB);
    } else if (t < 4.1) {
      r = ppEase(ppProgress(t, 2.7, 3.0)) * (1 - ppEase(ppProgress(t, 3.95, 4.1)));
      b = ppProgress(t, 3.5, 4.0);
      ppPut(guide, 212 + 6 * ppEase(b), 0, -1, 14 * Math.sin(Math.PI * b), -82 * r, 0);
    } else {
      c = ppCelebrate(t);
      ppPut(guide, 218, c.dy, 1, c.leg, c.armF, c.armB);
    }
    if (t < 3.3) {
      w = ppWalk(ppProgress(t, 0.9, 3.3), 70, 110);
      r = ppEase(ppProgress(t, 3.0, 3.3));
      ppPut(tourist, w.x, w.bob, 1, w.leg, w.armF * (1 - r) - 98 * r, w.armB);
    } else if (t < 4.1) {
      b = ppProgress(t, 3.4, 4.0);
      ppPut(tourist, 180 + 16 * ppEase(b), -3 * Math.sin(Math.PI * b), 1, 22 * Math.sin(Math.PI * b), -98 * (1 - ppEase(ppProgress(t, 3.95, 4.1))), 0);
    } else {
      c = ppCelebrate(t - 0.1);
      ppPut(tourist, 196, c.dy, 1, c.leg, c.armF, c.armB);
    }

    var morph = ppProgress(t, 6.0, 6.5);
    people.setAttribute('opacity', (ppProgress(t, 0.4, 0.8) * (1 - morph)).toFixed(3));
    if (!iso) return;

    var zin = ppEase(ppProgress(t, 5.4, 6.1)), zout = ppEase(ppProgress(t, 6.6, 7.7));
    var Z = ppLerp(1, 2.4, zin) * (1 - zout) + zout * 1;
    var pan = zin * (1 - zout);
    var o = camXY(0, 0, Z, pan);
    cam.setAttribute('transform', 'translate(' + o[0].toFixed(2) + ' ' + o[1].toFixed(2) + ') scale(' + Z.toFixed(4) + ')');

    var sa = 0.95, spread = ppEase(ppProgress(t, 6.1, 6.6));
    var ax = 196 - 28 * sa - spread * 14.6, ay = 137 - 101 * sa;
    p2.g.setAttribute('transform', 'translate(' + ((1 - spread) * -30.84).toFixed(2) + ' ' + ((1 - spread) * 24).toFixed(2) + ')');
    var Zm = ppLerp(1, 2.4, zin), pm = zin;
    var a0 = camXY(ax, ay, Zm, pm);
    var s0 = Zm * sa;
    var B = PP_LOCK.iso;
    var sF = ppLerp(s0, B.s, zout), xF = ppLerp(a0[0], B.tx, zout), yF = ppLerp(a0[1], B.ty, zout);
    iso.setAttribute('transform', 'translate(' + xF.toFixed(2) + ' ' + yF.toFixed(2) + ') scale(' + sF.toFixed(4) + ')');
    iso.setAttribute('opacity', morph.toFixed(3));
    var col = ppProgress(t, 6.7, 7.4);
    paintIso(ppMix(C.base, C.cream, col), ppMix(C.base, C.sun, col));

    wipeRect.setAttribute('width', (PP_LOCK.width * ppEase(ppProgress(t, 7.5, 8.1))).toFixed(1));
    if (tagG) tagG.setAttribute('opacity', ppProgress(t, 8.0, 8.5).toFixed(3));

    renderFlag(t);
  }

  function renderFlag(t) {
    var rise = ppEase(ppProgress(t, 7.0, 7.7));
    flag.setAttribute('opacity', rise > 0 ? '1' : '0');
    flag.setAttribute('transform', 'translate(207 137)');
    flagPole.setAttribute('transform', 'scale(1 ' + rise.toFixed(3) + ')');
    var unfurl = ppEase(ppProgress(t, 7.5, 8.1));
    var amp = 2.8 * (1 - ppEase(ppProgress(t, 9.2, 10.2)));
    var W = 28, H = 17, N = 8, top = [], bottom = [];
    for (var i = 0; i <= N; i++) {
      var x = (i / N) * W * unfurl;
      var d = amp * Math.sin(0.42 * x - 7.5 * t) * (x / W);
      top.push((1.5 + x).toFixed(2) + ' ' + (-46 + d).toFixed(2));
      bottom.unshift((1.5 + x).toFixed(2) + ' ' + (-46 + H + d * 0.85).toFixed(2));
    }
    flagCloth.setAttribute('d', unfurl > 0 ? 'M' + top.join(' L') + ' L' + bottom.join(' L') + ' Z' : '');
  }

  function renderWalk(t) {
    rings.forEach(function (e) { scaleRing(e, 1); });
    people.setAttribute('opacity', '1');
    var ph = t * 7, a = 26 * Math.sin(ph), a2 = 26 * Math.sin(ph + 1.6);
    ppPut(tourist, 132, -1.6 * Math.abs(Math.sin(ph)), 1, a, -a * 0.8, a * 0.8);
    ppPut(guide, 172, -1.6 * Math.abs(Math.sin(ph + 1.6)), 1, a2, -a2 * 0.8, a2 * 0.8);
  }

  var END = 10.2;
  var raf = 0, start = 0;
  var reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame(now) {
    var t = (now - start) / 1000;
    if (variant === 'walk') { renderWalk(t); raf = requestAnimationFrame(frame); }
    else if (variant === 'celebrate') { renderFull(4.1 + (t % 1.3)); raf = requestAnimationFrame(frame); }
    else {
      renderFull(Math.min(t, END));
      if (t < END) raf = requestAnimationFrame(frame);
      else if (opts.onDone) opts.onDone();
    }
  }
  function play() {
    cancelAnimationFrame(raf);
    if (reduce) {
      if (variant === 'walk') renderWalk(0.3); else renderFull(variant === 'full' ? END : 5.35);
      return;
    }
    start = performance.now();
    raf = requestAnimationFrame(frame);
  }
  play();
  return { play: play, destroy: function () { cancelAnimationFrame(raf); } };
}
