const Jimp = require('jimp');

async function analyze() {
  try {
    const image = await Jimp.read('client/src/assets/boss_dragon_sprite.png');
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    console.log('Boss sprite: ' + width + 'x' + height);
    
    // Check if image has non-white pixels
    let nonWhiteCount = 0;
    let colHasPixel = new Array(width).fill(false);
    let minY = height, maxY = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hex = image.getPixelColor(x, y);
        const r = (hex >> 24) & 255;
        const g = (hex >> 16) & 255;
        const b = (hex >> 8) & 255;
        if (!(r > 240 && g > 240 && b > 240)) {
          nonWhiteCount++;
          colHasPixel[x] = true;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    console.log('Non-white pixels: ' + nonWhiteCount);
    console.log('Y range: ' + minY + '-' + maxY + ' (h:' + (maxY - minY + 1) + ')');
    
    // Find X segments
    let xSegments = [];
    let inSeg = false, start = 0, gapCount = 0;
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
    
    console.log('X segments (' + xSegments.length + '): ' + xSegments.map(s => s[0] + '-' + s[1] + ' (w:' + s[2] + ')').join(', '));
    
    // Sample corner pixels
    const getP = (x, y) => {
      const hex = image.getPixelColor(x, y);
      return [(hex >> 24) & 255, (hex >> 16) & 255, (hex >> 8) & 255];
    };
    console.log('Corner TL:', getP(0, 0));
    console.log('Corner TR:', getP(width-1, 0));
    console.log('Corner BL:', getP(0, height-1));
    console.log('Corner BR:', getP(width-1, height-1));
  } catch(e) {
    console.log('Error:', e.message);
  }
}
analyze();
