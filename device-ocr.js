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
      const code = value.replace(/\s+/g,'');
      return /^[A-Z0-9][A-Z0-9-]{4,31}$/i.test(code) && (/\d/.test(code) || code === code.toUpperCase()) ? code.toUpperCase() : '';
    });
    const imei = firstValid(imeiLabel, value => {
      const code = value.replace(/[\s-]/g,'');
      return /^\d{15}$/.test(code) ? code : '';
    });
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
      return canvas;
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

  return { parse, recognize };
})();
