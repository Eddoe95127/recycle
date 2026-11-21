'use strict';

const deviceOcr = (() => {
  const assets = new URL('ocr/', document.currentScript.src);
  const modelNameLabel = /^(?:機\s*型|型\s*號)\s*名\s*稱|^(?:device\s+)?model\s*name\b/i;
  const modelNumberLabel = /^(?:機\s*型\s*)?型\s*[號号](?:\s*[號号]\s*碼)?|^機\s*型\s*[號号]\s*碼|^model(?:\s*(?:number|no\.?|#))?\b/i;
  const serialLabel = /^(?:裝\s*置\s*)?序\s*(?:列\s*)?[號号]|^serial(?:\s*(?:number|no\.?|#))?\b|^s\s*[/\\]\s*n\b/i;
  const imeiLabel = /^imei(?:\s*[12](?=[\s:：-]|$))?\b/i;
  const fields = /^(?:名稱|名\s*稱|iOS|版本|Version|容量|capacity|EID|MEID|ICCID|Wi-Fi|Bluetooth|藍牙)/i;
  let library;

  function loadLibrary() {
    if (!library) {
      library = new Promise((resolve,reject) => {
        const script = document.createElement('script');
        script.src = new URL('tesseract.min.js',assets).href;
        script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('辨識程式未載入。'));
        script.onerror = () => { script.remove(); reject(new Error('無法載入辨識程式，請稍後重試。')); };
        document.head.append(script);
      }).catch(error => { library = undefined; throw error; });
    }
    return library;
  }

  /** OCR 常把數字讀成相似字母 */
  const digits = value => String(value || '').replace(/[\s-]/g,'').replace(/[Oo]/g,'0').replace(/[Il|]/g,'1').replace(/S/g,'5').replace(/B/g,'8');
  /** IMEI 檢查碼（Luhn） */
  function luhn(code) {
    if (!/^\d{15}$/.test(code)) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) { let d = +code[i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; }
    return sum % 10 === 0;
  }

  /** 影像前處理：只取框內、放大、灰階、拉高對比；深色模式畫面自動反白 */
  function enhance(source, sx, sy, sw, sh, maxWidth = 1600) {
    const scale = Math.min(maxWidth / sw, 3);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const img = g.getImageData(0, 0, canvas.width, canvas.height), px = img.data, n = px.length / 4;
    const hist = new Uint32Array(256), lum = new Uint8ClampedArray(n);
    let total = 0;
    for (let i = 0; i < n; i++) { const v = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000; lum[i] = v; hist[lum[i]]++; total += v; }
    const pick = q => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * q) return v; } return 255; };
    const lo = pick(0.02), hi = Math.max(lo + 1, pick(0.98)), dark = total / n < 110;
    for (let i = 0; i < n; i++) {
      let v = (lum[i] - lo) * 255 / (hi - lo);
      if (dark) v = 255 - v;
      v = Math.max(0, Math.min(255, v));
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return canvas;
  }

  /** 黑白二值化（Otsu），字和底色分得更清楚 */
  function binarize(canvas) {
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const img = g.getImageData(0, 0, canvas.width, canvas.height), px = img.data, n = px.length / 4;
    const hist = new Array(256).fill(0);
    for (let i = 0; i < n; i++) hist[px[i * 4]]++;
    let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
    let sumB = 0, wB = 0, best = 0, th = 128;
    for (let v = 0; v < 256; v++) {
      wB += hist[v]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sumB += v * hist[v];
      const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; th = v; }
    }
    for (let i = 0; i < n; i++) { const v = px[i * 4] > th ? 255 : 0; px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; }
    g.putImageData(img, 0, 0);
    return canvas;
  }

  /** 只找 IMEI／序號（不需要中文標籤也找得到） */
  function parseCodes(text) {
    const r = parse(text);
    let imei = r.imei, serial = r.serial && /^[A-Z0-9]{8,14}$/.test(r.serial) && /[A-Z]/.test(r.serial) && /\d/.test(r.serial) ? r.serial : '';
    if (!serial) {
      // Apple 序號：10 或 12 碼英數混合（不含 O、I），排除純數字（IMEI、ICCID、EID）
      const tokens = text.toUpperCase().split(/[\s:：|,，;]+/).map(t => t.replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1'));
      const ok = t => (t.length === 10 || t.length === 12) && (t.match(/[A-Z]/g) || []).length >= 2 && (t.match(/\d/g) || []).length >= 2;
      serial = tokens.filter(ok).sort((a, b) => b.length - a.length)[0] || '';
    }
    return { imei, serial };
  }

  /** 連續掃描用：建立一次辨識引擎，重複使用。codes：只讀英數字（IMEI／序號），更快更準 */
  async function session(opt = {}) {
    const api = await loadLibrary();
    const worker = await api.createWorker(opt.codes ? ['eng'] : ['eng','chi_tra'], api.OEM.LSTM_ONLY, {
      workerPath:new URL('worker.min.js',assets).href,
      corePath:new URL('tesseract-core-lstm.wasm.js',assets).href,
      langPath:assets.href,
      workerBlobURL:false,
    });
    await worker.setParameters(opt.codes
      ? { tessedit_pageseg_mode:api.PSM.SINGLE_BLOCK, tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :-/', preserve_interword_spaces:'1' }
      : { tessedit_pageseg_mode:api.PSM.SPARSE_TEXT });
    return {
      async read(canvas) { const r = await worker.recognize(canvas); return { ...(opt.codes ? parseCodes(r.data.text) : parse(r.data.text)), text: r.data.text }; },
      end() { void worker.terminate(); },
    };
  }

  function parse(text) {
    const lines = text.normalize('NFKC').split(/\r?\n/).map(line => line.replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim()).filter(Boolean);
    const isLabel = line => [modelNameLabel,modelNumberLabel,serialLabel,imeiLabel,fields].some(label => label.test(line));
    function after(label) {
      return lines.flatMap((line,index) => {
        const match = line.match(label);
        if (!match) return [];
        const tail = line.slice(match[0].length).replace(/^[\s:：#|]+/,'');
        const next = lines[index + 1];
        return tail ? [tail] : next && !isLabel(next) ? [next] : [];
      });
    }
    function firstValid(label, convert) {
      return after(label).map(convert).find(Boolean) || '';
    }
    const all = lines.join('\n');
    const named = firstValid(modelNameLabel, value => /^[\p{L}\d][\p{L}\d .()\-+,/]{1,79}$/u.test(value) && (/^[a-z]/i.test(value) || /\d/.test(value)) ? value : '');
    const iPhone = all.match(/\bi\s*phone\s*(\d{1,2}(?:\s*(?:pro\s*max|pro|plus|mini|e))?|air|se|xs(?:\s*max)?|xr|x)\b/i);
    const iPhoneName = iPhone ? 'iPhone ' + iPhone[1].replace(/^(\d{1,2})(?=(?:pro|plus|mini))/i,'$1 ').replace(/pro\s*max/i,'Pro Max').replace(/\b(?:pro|plus|mini|air)\b/gi, word => ({pro:'Pro',plus:'Plus',mini:'mini',air:'Air'})[word.toLowerCase()]).replace(/^(se|xs|xr|x)\b/i, word => word.toUpperCase()) : '';
    const part = firstValid(modelNumberLabel, value => /^[a-z0-9][a-z0-9\-/]{3,25}$/i.test(value) && /\d/.test(value) ? value.toUpperCase() : '');
    const model = iPhoneName || named || part || all.match(/\bA\s*\d{4}\b/i)?.[0].replace(/\s/g,'').toUpperCase() || '';
    const serial = firstValid(serialLabel, value => {
      // Apple 序號不使用 O、I，OCR 讀成 O／I 的其實是 0／1
      const code = value.replace(/\s+/g,'').toUpperCase().replace(/O/g,'0').replace(/I/g,'1');
      return /^[A-Z0-9][A-Z0-9-]{4,31}$/.test(code) && /\d/.test(code) ? code : '';
    });
    const imeiOk = value => { const code = digits(value); return luhn(code) ? code : ''; };
    let imei = firstValid(imeiLabel, imeiOk);
    if (!imei) { // 沒有讀到「IMEI」字樣：整段文字裡找符合檢查碼的 15 位數字
      const runs = all.match(/(?:[\dOoIlSB][\s-]?){15,17}/g) || [];
      imei = runs.map(imeiOk).find(Boolean) || '';
    }
    return { model, serial, imei };
  }

  async function readPhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(2000 / Math.max(image.width,image.height), 2);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(image.width * scale));
      canvas.height = Math.max(1,Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = 'white';
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      return enhance(canvas, 0, 0, canvas.width, canvas.height, 2000);
    } catch {
      throw new Error('無法讀取照片，請試用 JPG 或 PNG。');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function recognize(file, progress, signal) {
    let worker;
    let stopped = false;
    let timeout;
    let stop;
    const cancellation = new Promise((_,reject) => {
      stop = reject;
      timeout = setTimeout(() => reject(new Error('辨識逾時，請重拍清楚的近照後再試。')),60000);
    });
    const cancel = () => stop(new Error('已取消辨識。'));
    signal.addEventListener('abort',cancel,{once:true});
    const task = async () => {
      const [api,canvas] = await Promise.all([loadLibrary(), readPhoto(file)]);
      if (stopped) return;
      worker = await api.createWorker(['eng','chi_tra'], api.OEM.LSTM_ONLY, {
        workerPath:new URL('worker.min.js',assets).href,
        corePath:new URL('tesseract-core-lstm.wasm.js',assets).href,
        langPath:assets.href,
        workerBlobURL:false,
        logger:message => { if (!stopped && message.status === 'recognizing text') progress(message.progress); },
        errorHandler:() => stop(new Error('辨識功能暫時無法使用，請重試或手動輸入。'))
      });
      if (stopped) { await worker.terminate(); return; }
      await worker.setParameters({ tessedit_pageseg_mode:api.PSM.SPARSE_TEXT });
      const result = await worker.recognize(canvas);
      return parse(result.data.text);
    };
    try {
      return await Promise.race([task(),cancellation]);
    } finally {
      stopped = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort',cancel);
      if (worker) void worker.terminate();
    }
  }

  return { parse, parseCodes, recognize, session, enhance, binarize, luhn };
})();
