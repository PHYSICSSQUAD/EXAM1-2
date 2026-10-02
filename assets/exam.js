/* ============ AI & IT, Final Exam engine ============ */
(function () {
 'use strict';

 var CFG = (window.CONFIG && window.CONFIG.teacher) || {};
 var Q = window.EXAM || [];
 var DURATION = 60 * 60;      // 60 دقيقة (اختياري: ?sec=NN للاختبار)
 (function () {
  var m = /[?&]sec=(\d+)/.exec(location.search);
  if (m) DURATION = Math.max(5, +m[1]);
 })();
 var PASS = 70;          // نسبة النجاح
 var MIN_WORDS = 35;        // الحد الأدنى المقترح للمقالي

 var OBJ = Q.filter(function (q) { return q.section === 'obj'; });
 var ESS = Q.filter(function (q) { return q.section === 'ess'; });
 var TOT_OBJ = OBJ.reduce(function (a, q) { return a + q.marks; }, 0);
 var TOT_ESS = ESS.reduce(function (a, q) { return a + q.marks; }, 0);
 var TOTAL = TOT_OBJ + TOT_ESS;

 var ans = {};     // id -> value
 var left = DURATION;
 var tick = null;
 var done = false;
 var started = 0;

 var $ = function (s, r) { return (r || document).querySelector(s); };
 var esc = function (s) {
  return String(s).replace(/[&<>"]/g, function (c) {
   return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
 };
 var words = function (s) { return (s || '').trim().split(/\s+/).filter(Boolean).length; };
 var LET = ['A', 'B', 'C', 'D', 'E', 'F'];

 /* ---------------- start screen ---------------- */
 function startScreen() {
  $('#app').innerHTML =
   '<div id="start"><div class="box">' +
   (CFG.logo ? '<img class="logo" src="' + CFG.logo + '" alt="logo">' : '') +
   '<h1>Comprehensive Final Exam: IT, AI and Cybersecurity</h1>' +
   '<p class="sub mono">&gt; chapter_1 + chapter_2 · lessons 1-1 → 2-3 · comprehensive assessment</p>' +
   '<p class="sub ar">امتحان شامل على الفصلين · نصه اختيار وتوصيل ونصه مقالي بلغة سهلة · متدرّج الصعوبة</p>' +
   '<div class="facts">' +
    '<div class="fact"><b>40</b><span>Questions</span></div>' +
    '<div class="fact"><b>' + TOTAL + '</b><span>Marks</span></div>' +
    '<div class="fact"><b>60:00</b><span>Minutes</span></div>' +
    '<div class="fact"><b>' + PASS + '%</b><span>Pass mark</span></div>' +
   '</div>' +
   '<ul class="rules ar">' +
 '<li>الامتحان <b>٤٠ سؤال</b> على <b>الفصلين مع بعض</b>: القسم الأول ٢٠ سؤال اختيار وتوصيل (١٠٠ درجة)، والقسم الثاني ٢٠ سؤال مقالي (١٠٠ درجة). المجموع ٢٠٠ درجة.</li>' +
 '<li>الأسئلة المقالية مكتوبة <b>بلغة سهلة وبسيطة</b>، بس الإجابة لازم تكون وافية.</li>' +
 '<li>الأسئلة <b>متدرّجة الصعوبة</b>: بتبدأ Easy وبتنتهي Extreme، ومعظمها Hard و Extreme.</li>' +
 '<li>المدة <b>ساعة كاملة</b>، فنظّم وقتك: حوالي دقيقة للسؤال الموضوعي والباقي للمقالي. العداد بيبدأ أول ما تضغط ابدأ ومش بيقف، ولما يخلص الوقت الامتحان بيتسلّم أوتوماتيك.</li>' +
 '<li>درجة النجاح <b>٧٠٪</b>: أقل من كده = Failed.</li>' +
 '<li>الأسئلة المقالية بتتصحّح أوتوماتيك بالكلمات المفتاحية، وهتشوف الإجابة النموذجية بعد التسليم.</li>' +
 '<li>إجاباتك بتتحفظ في المتصفح، فلو الصفحة قفلت بالغلط هتكمّل من مكانك والوقت بيفضل ماشي.</li>' +
'</ul>' +
   '<input class="nm" id="nm" placeholder="اسمك / Your name" autocomplete="off">' +
   '<div><button class="btn" id="go">ابدأ الامتحان · Start Exam →</button></div>' +
   '</div></div>';

  $('#go').onclick = begin;
  $('#nm').onkeydown = function (e) { if (e.key === 'Enter') begin(); };
 }

 /* ---------------- exam body ---------------- */
 function begin() {
  var nm = ($('#nm') && $('#nm').value.trim()) || '';
  try { sessionStorage.setItem('comp_exam_name', nm); } catch (e) {}
  started = Date.now();
  left = DURATION;
  build();
  runTimer();
  window.scrollTo(0, 0);
 }

 function qHead(q, n) {
  return '<div class="q-top">' +
   '<div class="q-no" id="no' + q.id + '">' + n + '</div>' +
   '<span class="tag t-' + q.level + '">' + q.level + '</span>' +
   '<span class="tag t-plain">' + (q.type === 'match' ? 'Matching' : q.type === 'mcq' ? 'Multiple choice' : 'Essay') + '</span>' +
   '<span class="tag t-plain">Lesson ' + q.lesson + '</span>' +
   '<span class="spacer"></span>' +
   '<span class="tag t-mark">' + q.marks + ' marks</span>' +
   '</div>';
 }

 function qBody(q) {
  if (q.type === 'mcq') {
   return q.options.map(function (o, i) {
    return '<div class="opt" data-q="' + q.id + '" data-i="' + i + '">' +
     '<span class="k">' + LET[i] + '</span><span>' + esc(o.t) + '</span></div>';
   }).join('');
  }
  if (q.type === 'match') {
   var leg = '<div class="legend"><div class="lt">Choose from</div><div class="chips">' +
    q.choices.map(function (c) {
     return '<span class="chip"><span class="k">' + c.id + '</span>' + esc(c.t) + '</span>';
    }).join('') + '</div></div>';
   var rows = q.rows.map(function (r) {
    return '<div class="row" id="row-' + q.id + '-' + r.id + '">' +
     '<div class="rl">' + r.id + ')</div><div class="rt">' + esc(r.t) + '</div>' +
     '<div class="chips">' + q.choices.map(function (c) {
      return '<span class="chip" data-q="' + q.id + '" data-r="' + r.id + '" data-c="' + c.id + '">' +
       '<span class="k">' + c.id + '</span>' + esc(c.t) + '</span>';
     }).join('') + '</div></div>';
   }).join('');
   return leg + rows;
  }
  // essay
  return '<textarea data-q="' + q.id + '" placeholder="اكتب إجابتك هنا بالإنجليزي… حاول تغطّي كل العناصر المطلوبة في السؤال."></textarea>' +
   '<div class="meta"><span id="w' + q.id + '" class="lo">0 words</span>' +
   '<span>يُفضَّل ' + MIN_WORDS + '+ كلمة · ' + q.marks + ' marks</span></div>';
 }

 function build() {
  var n = 0, html = '';
  html += '<div class="sec-h"><div class="n">I</div><div><h2>Section I, Objective</h2>' +
   '<p>Multiple choice &amp; matching · ' + TOT_OBJ + ' marks · اختيار من متعدد وتوصيل</p></div></div>';
  OBJ.forEach(function (q) { n++; html += '<div class="card q" id="q' + q.id + '">' + qHead(q, n) + '<div class="q-text">' + esc(q.q) + '</div>' + qBody(q) + '</div>'; });

  html += '<div class="sec-h"><div class="n">II</div><div><h2>Section II, Essay</h2>' +
   '<p>Written analysis · ' + TOT_ESS + ' marks · أسئلة مقالية تحليلية</p></div></div>';
  ESS.forEach(function (q) { n++; html += '<div class="card q" id="q' + q.id + '">' + qHead(q, n) + '<div class="q-text">' + esc(q.q) + '</div>' + qBody(q) + '</div>'; });

  html += '<div class="card" style="text-align:center">' +
   '<p style="color:var(--muted);font-size:14px;margin-bottom:14px" class="ar">راجع إجاباتك كويس, بعد التسليم مش هتقدر تعدّل.</p>' +
   '<button class="btn" id="submit">تسليم الامتحان · Submit</button></div>';

  $('#app').innerHTML = '<div class="wrap">' + html + '</div>' +
   '<div id="nav"><div class="in"><div class="dots" id="dots"></div>' +
   '<span class="pill"><span id="cnt">0</span>/20 answered</span></div></div>';

  $('#dots').innerHTML = Q.map(function (q, i) {
   return '<span class="dot" id="d' + q.id + '" data-go="' + q.id + '">' + (i + 1) + '</span>';
  }).join('');

  $('#hdrbar').classList.remove('hide');
  wire();
 }

 function wire() {
  $('#app').addEventListener('click', function (e) {
   if (done) return;
   var o = e.target.closest('.opt');
   if (o) {
    var id = o.dataset.q;
    [].forEach.call(document.querySelectorAll('.opt[data-q="' + id + '"]'), function (x) { x.classList.remove('sel'); });
    o.classList.add('sel');
    ans[id] = +o.dataset.i;
    mark(id); return;
   }
   var c = e.target.closest('.row .chip');
   if (c) {
    var q = c.dataset.q, r = c.dataset.r;
    [].forEach.call(document.querySelectorAll('.chip[data-q="' + q + '"][data-r="' + r + '"]'), function (x) { x.classList.remove('sel'); });
    c.classList.add('sel');
    ans[q] = ans[q] || {};
    ans[q][r] = c.dataset.c;
    mark(q); return;
   }
   var d = e.target.closest('.dot');
   if (d) { var el = $('#q' + d.dataset.go); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
   if (e.target.id === 'submit') { if (confirm('تسليم الامتحان نهائياً؟')) finish('submitted'); }
  });

  $('#app').addEventListener('input', function (e) {
   if (done || e.target.tagName !== 'TEXTAREA') return;
   var id = e.target.dataset.q, w = words(e.target.value);
   ans[id] = e.target.value;
   var m = $('#w' + id);
   m.textContent = w + ' words';
   m.className = w >= MIN_WORDS ? 'hi' : 'lo';
   mark(id); save();
  });
 }

 function answered(q) {
  var v = ans[q.id];
  if (q.type === 'mcq') return typeof v === 'number';
  if (q.type === 'match') return v && Object.keys(v).length === q.rows.length;
  return words(v) >= 5;
 }

 function mark(id) {
  var q = Q.find(function (x) { return x.id === id; });
  var ok = answered(q);
  var no = $('#no' + id), dot = $('#d' + id);
  if (no) no.classList.toggle('done', ok);
  if (dot) dot.classList.toggle('done', ok);
  $('#cnt').textContent = Q.filter(answered).length;
  save();
 }

 function save() {
  try {
   localStorage.setItem('comp_exam_state', JSON.stringify({ ans: ans, left: left, t: Date.now() }));
  } catch (e) {}
 }

 /* ---------------- timer ---------------- */
 function fmt(s) {
  var m = Math.floor(s / 60), x = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x;
 }
 function runTimer() {
  clearInterval(tick);
  paint();
  tick = setInterval(function () {
   left--;
   paint();
   if (left % 5 === 0) save();
   if (left <= 0) { clearInterval(tick); finish('timeout'); }
  }, 1000);
 }
 function paint() {
  var t = $('#timer'), b = $('#barf');
  t.textContent = fmt(Math.max(0, left));
  var pct = (left / DURATION) * 100;
  b.style.width = Math.max(0, pct) + '%';
  var cls = left <= 60 ? 'crit' : left <= 300 ? 'warn' : '';
  t.className = cls; b.className = cls;
 }

 /* ---------------- grading ---------------- */
 function gradeObj(q) {
  var v = ans[q.id], got = 0, detail = '';
  if (q.type === 'mcq') {
   var ci = q.options.findIndex(function (o) { return o.c; });
   got = (v === ci) ? q.marks : 0;
   detail = 'Correct answer: <b>' + LET[ci] + '</b>' + esc(q.options[ci].t);
   [].forEach.call(document.querySelectorAll('.opt[data-q="' + q.id + '"]'), function (o, i) {
    o.classList.remove('sel');
    if (i === ci) o.classList.add('ok');
    else if (i === v) o.classList.add('bad');
   });
  } else {
   var rows = q.rows.length, hit = 0;
   q.rows.forEach(function (r) {
    var pick = v && v[r.id], good = q.answer[r.id];
    if (pick === good) hit++;
    var el = $('#row-' + q.id + '-' + r.id);
    if (el) el.classList.add(pick === good ? 'ok' : 'bad');
   });
   got = Math.round((hit / rows) * q.marks * 100) / 100;
   detail = 'Correct matching: ' + q.rows.map(function (r) {
    var ch = q.choices.find(function (c) { return c.id === q.answer[r.id]; });
    return '<b>' + r.id + ' → ' + q.answer[r.id] + '</b> ' + esc(ch.t);
   }).join(' · ') + ' <i>(' + hit + '/' + rows + ' correct)</i>';
  }
  return { got: got, detail: detail };
 }

 function gradeEssay(q) {
  var txt = (ans[q.id] || '').toLowerCase(), w = words(ans[q.id]);
  var hits = [], miss = [];
  q.keys.forEach(function (group) {
   var found = group.some(function (k) { return txt.indexOf(k.toLowerCase()) >= 0; });
   (found ? hits : miss).push(group[0]);
  });
  var ratio = hits.length / q.keys.length;
  // عقوبة خفيفة لو الإجابة قصيرة جداً
  var lenFactor = w >= MIN_WORDS ? 1 : Math.max(.55, w / MIN_WORDS);
  var got = w < 5 ? 0 : Math.round(q.marks * ratio * lenFactor * 100) / 100;
  return { got: got, hits: hits, miss: miss, w: w };
 }

 function finish(reason) {
  if (done) return;
  done = true;
  clearInterval(tick);
  try { localStorage.removeItem('comp_exam_state'); } catch (e) {}

  var objGot = 0, essGot = 0, rows = '';
  var n = 0, detailHtml = '';

  OBJ.forEach(function (q) {
   n++;
   var g = gradeObj(q);
   objGot += g.got;
   rows += '<tr><td>' + n + '</td><td>' + q.type.toUpperCase() + '</td><td><span class="tag t-' + q.level + '">' + q.level + '</span></td>' +
    '<td class="r" style="color:' + (g.got === q.marks ? 'var(--green)' : g.got > 0 ? 'var(--amber)' : 'var(--red)') + '">' +
    g.got + ' / ' + q.marks + '</td></tr>';
   var card = $('#q' + q.id);
   card.insertAdjacentHTML('beforeend',
    '<div class="model"><div class="mt">' + (g.got === q.marks ? '✔ Correct, ' + g.got + '/' + q.marks : '✖ ' + g.got + '/' + q.marks) + '</div>' +
    g.detail + '<div style="margin-top:8px;color:var(--muted)">' + esc(q.expl || '') + '</div></div>');
  });

  ESS.forEach(function (q) {
   n++;
   var g = gradeEssay(q);
   essGot += g.got;
   rows += '<tr><td>' + n + '</td><td>ESSAY</td><td><span class="tag t-' + q.level + '">' + q.level + '</span></td>' +
    '<td class="r" style="color:' + (g.got >= q.marks * .7 ? 'var(--green)' : g.got > 0 ? 'var(--amber)' : 'var(--red)') + '">' +
    g.got + ' / ' + q.marks + '</td></tr>';
   var ta = document.querySelector('textarea[data-q="' + q.id + '"]');
   if (ta) ta.readOnly = true;
   var kws = g.hits.map(function (k) { return '<span class="kw hit">✔ ' + esc(k) + '</span>'; }).join('') +
    g.miss.map(function (k) { return '<span class="kw miss">✖ ' + esc(k) + '</span>'; }).join('');
   $('#q' + q.id).insertAdjacentHTML('beforeend',
    '<div class="model"><div class="mt">Score ' + g.got + ' / ' + q.marks + ' · ' + g.hits.length + '/' + q.keys.length + ' key points · ' + g.w + ' words</div>' +
    '<div style="margin-bottom:10px">' + kws + '</div>' +
    '<div class="mt">Model answer</div>' + esc(q.answer) + '</div>');
  });

  var got = Math.round((objGot + essGot) * 100) / 100;
  var pct = Math.round((got / TOTAL) * 1000) / 10;
  var passed = pct >= PASS;
  var used = DURATION - Math.max(0, left);

  var C = 2 * Math.PI * 82;
  var off = C * (1 - Math.min(pct, 100) / 100);
  var col = passed ? 'var(--green)' : 'var(--red)';
  var nm = '';
  try { nm = sessionStorage.getItem('comp_exam_name') || ''; } catch (e) {}

  var head =
   '<div class="card" id="res">' +
   (nm ? '<p style="text-align:center;color:var(--muted);font-size:14px">' + esc(nm) + '</p>' : '') +
   '<div class="ring"><svg width="190" height="190">' +
   '<circle cx="95" cy="95" r="82" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="13"/>' +
   '<circle cx="95" cy="95" r="82" fill="none" stroke="' + col + '" stroke-width="13" stroke-linecap="round" ' +
   'stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg>' +
   '<div class="val"><b style="color:' + col + '">' + pct + '%</b><span>' + got + ' / ' + TOTAL + '</span></div></div>' +
   '<div class="verdict ' + (passed ? 'pass' : 'fail') + '">' + (passed ? '✔ PASSED' : '✖ FAILED') + '</div>' +
   '<p style="text-align:center;color:var(--muted);font-size:14px" class="ar">' +
   (passed ? 'مبروك, عدّيت درجة النجاح (٧٠٪).' : 'للأسف أقل من درجة النجاح (٧٠٪). راجع الإجابات النموذجية تحت وحاول تاني.') +
   (reason === 'timeout' ? ' <b style="color:var(--amber)">انتهى الوقت وتم التسليم أوتوماتيك.</b>' : '') + '</p>' +
   '<div class="grid3">' +
   '<div class="tot"><b style="color:var(--blue-2)">' + Math.round(objGot * 100) / 100 + ' / ' + TOT_OBJ + '</b><span>Section I, Objective</span></div>' +
   '<div class="tot"><b style="color:var(--violet-2)">' + Math.round(essGot * 100) / 100 + ' / ' + TOT_ESS + '</b><span>Section II, Essay</span></div>' +
   '<div class="tot"><b>' + fmt(used) + '</b><span>Time used</span></div>' +
   '</div>' +
   '<table><thead><tr><th>#</th><th>Type</th><th>Level</th><th class="r">Score</th></tr></thead><tbody>' + rows +
   '<tr><td colspan="3"><b>TOTAL</b></td><td class="r"><b style="color:' + col + '">' + got + ' / ' + TOTAL + '</b></td></tr>' +
   '</tbody></table>' +
   '<div style="text-align:center;margin-top:18px">' +
   '<button class="btn" onclick="location.reload()">إعادة الامتحان · Retake</button> ' +
   '<button class="btn ghost" onclick="window.print()">طباعة النتيجة</button></div>' +
   '</div>';

  var nav = $('#nav'); if (nav) nav.remove();
  var sub = $('#submit'); if (sub) sub.closest('.card').remove();
  $('.wrap').insertAdjacentHTML('afterbegin', head);
  $('#timer').textContent = 'DONE';
  $('#timer').className = '';
  $('#barf').style.width = '0%';
  $('#res').scrollIntoView({ behavior: 'smooth' });
 }

 /* ---------------- boot ---------------- */
 document.addEventListener('DOMContentLoaded', function () {
  var b = $('.brand');
  if (b) b.innerHTML = '<b>' + esc(CFG.name || 'Final Exam') + '</b><span>Comprehensive Exam, Chapters 1 and 2</span>';
  var lg = $('#hdrlogo');
  if (lg && CFG.logo) lg.src = CFG.logo; else if (lg) lg.remove();
  startScreen();
  window.addEventListener('beforeunload', function (e) {
   if (!done && started) { e.preventDefault(); e.returnValue = ''; }
  });
 });
})();
