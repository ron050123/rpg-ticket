const Jimp = require('jimp');

async function analyze(file) {
  const image = await Jimp.read('client/src/assets/' + file);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  let colHasPixel = new Array(width).fill(false);
  let rowHasPixel = new Array(height).fill(false);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const hex = image.getPixelColor(x, y);
      const r = (hex >> 24) & 255;
      const g = (hex >> 16) & 255;
      const b = (hex >> 8) & 255;
      if (!(r > 240 && g > 240 && b > 240)) {
        colHasPixel[x] = true;
        rowHasPixel[y] = true;
      }
    }
  }
  
  let xSegments = [];
  let inSeg = false;
  let start = 0;
  let gapCount = 0;
  const GAP = 5;
  for (let x = 0; x < width; x++) {
    if (colHasPixel[x]) {
      if (!inSeg) { inSeg = true; start = x; }
      gapCount = 0;
    } else {
      if (inSeg) {
        gapCount++;
        if (gapCount >= GAP) {
          xSegments.push([start, x - gapCount, x - gapCount - start + 1]);
          inSeg = false; gapCount = 0;
        }
      }
    }
  }
  if (inSeg) xSegments.push([start, width - 1 - gapCount, width - gapCount - start]);
  
  let ySegments = [];
  inSeg = false; gapCount = 0;
  for (let y = 0; y < height; y++) {
    if (rowHasPixel[y]) {
      if (!inSeg) { inSeg = true; start = y; }
      gapCount = 0;
    } else {
      if (inSeg) {
        gapCount++;
        if (gapCount >= GAP) {
          ySegments.push([start, y - gapCount, y - gapCount - start + 1]);
          inSeg = false; gapCount = 0;
        }
      }
    }
  }
  if (inSeg) ySegments.push([start, height - 1 - gapCount, height - gapCount - start]);
  
  console.log('--- ' + file + ' (' + width + 'x' + height + ') ---');
  console.log('X segments (' + xSegments.length + '):', xSegments.map(s => s[0] + '-' + s[1] + ' (w:' + s[2] + ')').join(', '));
  console.log('Y segments (' + ySegments.length + '):', ySegments.map(s => s[0] + '-' + s[1] + ' (h:' + s[2] + ')').join(', '));
}

async function run() {
  await analyze('mage_sprite.png');
  await analyze('rogue_sprite.png');
}
run();
