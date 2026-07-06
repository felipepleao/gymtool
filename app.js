/* ============================================================
   ASSISTENTE DE TREINO — versão HTML/CSS/JS puro
   Porte fiel do projeto React, usando localStorage.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Storage (localStorage com fallback em memória) ---------- */
  var mem = {};
  var store = {
    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        return raw != null ? JSON.parse(raw) : (mem[key] != null ? mem[key] : null);
      } catch (e) {
        return mem[key] != null ? mem[key] : null;
      }
    },
    set: function (key, value) {
      mem[key] = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* segue com memória */ }
    }
  };

  /* ---------- Utils ---------- */
  var uid = function () { return Math.random().toString(36).slice(2, 10); };
  var today = function () { return new Date().toISOString(); };
  var fmtDate = function (iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };
  var mmss = function (s) {
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  // Escapa texto para inserção segura em HTML
  var esc = function (v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  /* ---------- Treino de exemplo ---------- */
  var seedWorkouts = function () {
    return [{
      id: uid(),
      name: "Treino A — Peito e Tríceps",
      exercises: [
        { id: uid(), name: "Supino reto", sets: 4, reps: "10", load: "30 kg/lado", rest: 90, notes: "Escápulas retraídas, desça controlado." },
        { id: uid(), name: "Supino inclinado com halteres", sets: 3, reps: "12", load: "22 kg", rest: 75, notes: "" },
        { id: uid(), name: "Crossover", sets: 3, reps: "15", load: "15 kg", rest: 60, notes: "Aperte no fim do movimento." },
        { id: uid(), name: "Tríceps corda", sets: 4, reps: "12", load: "25 kg", rest: 60, notes: "Cotovelos junto ao corpo." }
      ]
    }];
  };

  /* ---------- Estado ---------- */
  var state = {
    view: "home",       // home | editor | run | history
    workouts: [],
    history: [],
    session: null,
    editing: null
  };

  // Estado transitório do timer (não persistido)
  var runtime = { resting: false, remaining: 0, total: 1, paused: false, interval: null };

  var app = document.getElementById("app");

  /* ---------- Persistência ---------- */
  function save() {
    store.set("workouts", state.workouts);
    store.set("history", state.history);
    store.set("activeSession", state.session);
  }
  function saveWorkouts() { store.set("workouts", state.workouts); }
  function saveHistory() { store.set("history", state.history); }
  function saveSession() { store.set("activeSession", state.session); }

  /* ============================================================
     RENDER
     ============================================================ */
  function render() {
    clearTimer();
    app.innerHTML = "";
    if (state.view === "home") renderHome();
    else if (state.view === "editor") renderEditor();
    else if (state.view === "run") renderRunner();
    else if (state.view === "history") renderHistory();
  }

  // Cria elemento a partir de HTML string
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function topbar(opts) {
    var wrap = el('<div class="topbar"></div>');
    if (opts.left) wrap.appendChild(opts.left);
    var body = el('<div class="tb-body"></div>');
    body.appendChild(el('<div class="tb-title">' + esc(opts.title) + '</div>'));
    if (opts.sub) body.appendChild(el('<div class="tb-sub">' + esc(opts.sub) + '</div>'));
    wrap.appendChild(body);
    if (opts.right) wrap.appendChild(opts.right);
    return wrap;
  }

  function ghost(label, onClick, extraClass) {
    var b = el('<button class="ghost-btn ' + (extraClass || "") + '">' + label + '</button>');
    b.addEventListener("click", onClick);
    return b;
  }

  /* ============================================================
     HOME
     ============================================================ */
  function renderHome() {
    var root = el('<div style="padding-bottom:40px"></div>');

    var histBtn = ghost("Histórico" + (state.history.length ? " · " + state.history.length : ""),
      function () { state.view = "history"; render(); });

    root.appendChild(topbar({
      title: "Seus treinos",
      sub: "Escolha um treino e comece a série 1",
      right: histBtn
    }));

    var list = el('<div class="pad-list"></div>');

    if (state.workouts.length === 0) {
      list.appendChild(el('<div class="empty">Nenhum treino ainda. Crie o primeiro abaixo.</div>'));
    }

    state.workouts.forEach(function (w) {
      var totalSets = w.exercises.reduce(function (a, e) { return a + Number(e.sets || 0); }, 0);
      var card = el('<div class="workout-card"></div>');
      card.appendChild(el('<div class="wc-name">' + esc(w.name || "Sem nome") + '</div>'));
      card.appendChild(el('<div class="wc-meta">' + w.exercises.length + ' exercícios · ' + totalSets + ' séries</div>'));

      var chips = el('<div class="chips"></div>');
      w.exercises.slice(0, 4).forEach(function (e) {
        chips.appendChild(el('<span class="chip">' + esc(e.name) + '</span>'));
      });
      if (w.exercises.length > 4) {
        chips.appendChild(el('<span class="chip more">+' + (w.exercises.length - 4) + '</span>'));
      }
      card.appendChild(chips);

      var actions = el('<div class="card-actions"></div>');
      var startBtn = el('<button class="primary-btn">INICIAR TREINO</button>');
      startBtn.disabled = w.exercises.length === 0;
      startBtn.addEventListener("click", function () { startWorkout(w); });
      actions.appendChild(startBtn);

      actions.appendChild(ghost("Editar", function () {
        state.editing = JSON.parse(JSON.stringify(w));
        state.view = "editor";
        render();
      }));

      var delBtn = ghost("✕", function () {
        if (confirm("Excluir este treino?")) {
          state.workouts = state.workouts.filter(function (x) { return x.id !== w.id; });
          saveWorkouts();
          render();
        }
      }, "danger");
      actions.appendChild(delBtn);

      card.appendChild(actions);
      list.appendChild(card);
    });

    root.appendChild(list);

    var newWrap = el('<div class="pad-btn"></div>');
    var newBtn = el('<button class="dashed-btn">+ Criar novo treino</button>');
    newBtn.addEventListener("click", function () {
      state.editing = { id: uid(), name: "", exercises: [] };
      state.view = "editor";
      render();
    });
    newWrap.appendChild(newBtn);
    root.appendChild(newWrap);

    app.appendChild(root);
  }

  function startWorkout(w) {
    state.session = {
      workoutId: w.id,
      name: w.name,
      startedAt: today(),
      currentIndex: 0,
      exercises: w.exercises.map(function (e) {
        return Object.assign({}, e, { done: 0, loadUsed: e.load });
      })
    };
    saveSession();
    state.view = "run";
    render();
  }

  /* ============================================================
     EDITOR
     ============================================================ */
  function renderEditor() {
    var wk = state.editing;
    var root = el('<div style="padding-bottom:100px"></div>');

    root.appendChild(topbar({
      title: wk.name ? "Editar treino" : "Novo treino",
      left: ghost("←", function () { state.view = "home"; render(); })
    }));

    var nameWrap = el('<div class="pad-list" style="padding-bottom:0"></div>');
    nameWrap.appendChild(el('<div class="label">Nome do treino</div>'));
    var nameInput = el('<input class="field big" placeholder="Ex: Treino A — Peito e Tríceps" />');
    nameInput.value = wk.name;
    nameInput.addEventListener("input", function () { wk.name = nameInput.value; });
    nameWrap.appendChild(nameInput);
    root.appendChild(nameWrap);

    var listWrap = el('<div class="editor-list"></div>');
    wk.exercises.forEach(function (e, i) {
      listWrap.appendChild(buildExEditor(e, i, wk));
    });

    var addBtn = el('<button class="dashed-btn" style="padding:14px">+ Adicionar exercício</button>');
    addBtn.addEventListener("click", function () {
      wk.exercises.push({ id: uid(), name: "", sets: 4, reps: "10", load: "", rest: 60, notes: "" });
      render();
    });
    listWrap.appendChild(addBtn);
    root.appendChild(listWrap);

    // Barra de salvar
    var saveBar = el('<div class="save-bar"></div>');
    var saveBtn = el('<button class="primary-btn">SALVAR TREINO</button>');
    function computeCanSave() {
      return wk.name.trim() && wk.exercises.length &&
        wk.exercises.every(function (ex) { return String(ex.name).trim(); });
    }
    saveBtn.disabled = !computeCanSave();
    saveBtn.addEventListener("click", function () {
      if (!computeCanSave()) return;
      var payload = {
        id: wk.id,
        name: wk.name.trim(),
        exercises: wk.exercises.map(function (ex) {
          return Object.assign({}, ex, {
            sets: Math.max(1, Number(ex.sets) || 1),
            rest: Math.max(0, Number(ex.rest) || 0)
          });
        })
      };
      var exists = state.workouts.some(function (x) { return x.id === payload.id; });
      state.workouts = exists
        ? state.workouts.map(function (x) { return x.id === payload.id ? payload : x; })
        : state.workouts.concat([payload]);
      saveWorkouts();
      state.view = "home";
      render();
    });
    // Reavalia o botão conforme edita (sem re-render, para não perder foco)
    root.addEventListener("input", function () { saveBtn.disabled = !computeCanSave(); });
    saveBar.appendChild(saveBtn);
    root.appendChild(saveBar);

    app.appendChild(root);
  }

  function buildExEditor(e, i, wk) {
    var card = el('<div class="ex-editor"></div>');

    var head = el('<div class="ex-head"></div>');
    head.appendChild(el('<span class="ex-num">' + (i + 1) + '</span>'));
    var nameIn = el('<input class="field bold" placeholder="Nome do exercício" />');
    nameIn.value = e.name;
    nameIn.addEventListener("input", function () { e.name = nameIn.value; });
    head.appendChild(nameIn);
    card.appendChild(head);

    var grid = el('<div class="grid2"></div>');
    grid.appendChild(numField("Séries", e.sets, "1", "1", function (v) { e.sets = v; }));
    grid.appendChild(textField("Repetições", e.reps, "10 ou 8-12", function (v) { e.reps = v; }));
    grid.appendChild(textField("Carga", e.load, "30 kg/lado", function (v) { e.load = v; }));
    grid.appendChild(numField("Descanso (s)", e.rest, "0", "5", function (v) { e.rest = v; }));
    card.appendChild(grid);

    var notesWrap = el('<div class="mt10"></div>');
    notesWrap.appendChild(el('<div class="label">Observações</div>'));
    var ta = el('<textarea class="field" rows="2" placeholder="Técnica, cadência, dicas…"></textarea>');
    ta.value = e.notes;
    ta.addEventListener("input", function () { e.notes = ta.value; });
    notesWrap.appendChild(ta);
    card.appendChild(notesWrap);

    var tools = el('<div class="ex-tools"></div>');
    var upBtn = ghost("↑", function () { move(wk, i, -1); });
    upBtn.disabled = i === 0;
    var downBtn = ghost("↓", function () { move(wk, i, 1); });
    downBtn.disabled = i === wk.exercises.length - 1;
    tools.appendChild(upBtn);
    tools.appendChild(downBtn);
    tools.appendChild(el('<div class="spacer"></div>'));
    tools.appendChild(ghost("Remover", function () {
      wk.exercises = wk.exercises.filter(function (x) { return x.id !== e.id; });
      render();
    }, "danger"));
    card.appendChild(tools);

    return card;
  }

  function textField(label, value, ph, onInput) {
    var wrap = el('<div></div>');
    wrap.appendChild(el('<div class="label">' + esc(label) + '</div>'));
    var input = el('<input class="field" placeholder="' + esc(ph) + '" />');
    input.value = value == null ? "" : value;
    input.addEventListener("input", function () { onInput(input.value); });
    wrap.appendChild(input);
    return wrap;
  }
  function numField(label, value, min, step, onInput) {
    var wrap = el('<div></div>');
    wrap.appendChild(el('<div class="label">' + esc(label) + '</div>'));
    var input = el('<input class="field" type="number" min="' + min + '" step="' + step + '" />');
    input.value = value == null ? "" : value;
    input.addEventListener("input", function () { onInput(input.value); });
    wrap.appendChild(input);
    return wrap;
  }

  function move(wk, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= wk.exercises.length) return;
    var arr = wk.exercises;
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    render();
  }

  /* ============================================================
     RUNNER
     ============================================================ */
  function currentEx() { return state.session.exercises[state.session.currentIndex]; }

  function patchEx(patch) {
    var s = state.session;
    s.exercises[s.currentIndex] = Object.assign({}, s.exercises[s.currentIndex], patch);
    saveSession();
  }

  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ac = new Ctx();
      [0, 0.18, 0.36].forEach(function (t) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = 880;
        o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.15);
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.16);
      });
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    } catch (e) {}
  }

  function clearTimer() {
    if (runtime.interval) { clearInterval(runtime.interval); runtime.interval = null; }
  }

  function tickStart() {
    clearTimer();
    if (!runtime.resting || runtime.paused) return;
    runtime.interval = setInterval(function () {
      if (runtime.remaining <= 1) {
        clearTimer();
        runtime.resting = false;
        runtime.remaining = 0;
        beep();
        renderRunner();
        return;
      }
      runtime.remaining -= 1;
      updateRingDom();
    }, 1000);
  }

  function updateRingDom() {
    var timeEl = document.querySelector(".ring-time");
    var circleEl = document.querySelector(".ring-progress");
    if (timeEl) timeEl.textContent = mmss(runtime.remaining);
    if (circleEl) {
      var R = 54, CIRC = 2 * Math.PI * R;
      var frac = runtime.total ? runtime.remaining / runtime.total : 0;
      circleEl.setAttribute("stroke-dashoffset", CIRC * (1 - frac));
    }
    var labelEl = document.querySelector(".ring-label");
    if (labelEl) labelEl.textContent = runtime.paused ? "PAUSADO" : "DESCANSO";
  }

  function startRest(secs) {
    runtime.remaining = secs;
    runtime.total = secs || 1;
    runtime.paused = false;
    runtime.resting = secs > 0;
    renderRunner();
  }
  function stopRest() {
    clearTimer();
    runtime.resting = false;
    runtime.paused = false;
  }

  function completeSet() {
    var ex = currentEx();
    if (ex.done >= ex.sets) return;
    var nd = ex.done + 1;
    patchEx({ done: nd });
    if (nd < ex.sets) startRest(Number(ex.rest) || 0);
    else { stopRest(); renderRunner(); }
  }
  function undoSet() {
    var ex = currentEx();
    if (ex.done > 0) patchEx({ done: ex.done - 1 });
    stopRest();
    renderRunner();
  }
  function goTo(i) {
    stopRest();
    state.session.currentIndex = i;
    saveSession();
    renderRunner();
  }

  function finishSession() {
    if (state.session) {
      var s = state.session;
      var entry = {
        id: uid(),
        workoutId: s.workoutId,
        name: s.name,
        date: s.startedAt,
        exercises: s.exercises.map(function (e) {
          return { name: e.name, sets: e.sets, load: e.loadUsed };
        })
      };
      state.history = [entry].concat(state.history);
      saveHistory();
    }
    state.session = null;
    saveSession();
    state.view = "home";
    render();
  }
  function quitSession() {
    stopRest();
    state.session = null;
    saveSession();
    state.view = "home";
    render();
  }

  function renderRunner() {
    clearTimer();
    app.innerHTML = "";
    var s = state.session;
    var ex = currentEx();
    var totalEx = s.exercises.length;
    var exDone = ex.done >= ex.sets;

    var totalSets = s.exercises.reduce(function (a, e) { return a + Number(e.sets); }, 0);
    var doneSets = s.exercises.reduce(function (a, e) { return a + e.done; }, 0);
    var pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
    var allDone = s.exercises.every(function (e) { return e.done >= e.sets; });

    var accent = runtime.resting ? "var(--rest)" : (exDone ? "var(--done)" : "var(--volt)");

    var root = el('<div style="padding-bottom:130px"></div>');

    /* Topo: progresso */
    var top = el('<div class="run-top"></div>');
    var head = el('<div class="run-head"></div>');
    var quitBtn = ghost("← Sair", function () {
      if (confirm("Sair do treino? O progresso fica salvo.")) quitSession();
    });
    head.appendChild(quitBtn);
    head.appendChild(el('<div class="run-name">' + esc(s.name) + '</div>'));
    head.appendChild(el('<div class="run-pct" style="color:' + accent + '">' + pct + '%</div>'));
    top.appendChild(head);

    var track = el('<div class="progress-track"></div>');
    track.appendChild(el('<div class="progress-fill" style="width:' + pct + '%;background:' + accent + '"></div>'));
    top.appendChild(track);

    /* Trilha de exercícios */
    var rail = el('<div class="ex-rail"></div>');
    s.exercises.forEach(function (e, i) {
      var st = e.done >= e.sets ? "done" : (i === s.currentIndex ? "cur" : "todo");
      var cls = st === "cur" ? "cur" : (st === "done" ? "done" : "");
      var short = e.name.split(" ").slice(0, 2).join(" ");
      var btn = el('<button class="rail-btn ' + cls + '">' +
        (st === "done" ? "✓ " : "") + (i + 1) + '. ' + esc(short) + '</button>');
      if (st === "cur") btn.style.borderColor = accent;
      btn.addEventListener("click", function () { goTo(i); });
      rail.appendChild(btn);
    });
    top.appendChild(rail);
    root.appendChild(top);

    /* Card do exercício atual */
    var cardWrap = el('<div class="run-card-wrap"></div>');
    var card = el('<div class="run-card"></div>');
    card.appendChild(el('<div class="rc-kicker">EXERCÍCIO ' + (s.currentIndex + 1) + ' DE ' + totalEx + '</div>'));
    card.appendChild(el('<div class="rc-title">' + esc(ex.name) + '</div>'));

    var stats = el('<div class="stats-grid"></div>');
    stats.appendChild(statBox("Repetições", ex.reps, null));
    stats.appendChild(statBox("Descanso", ex.rest + "s", null));
    stats.appendChild(loadStat(ex.loadUsed));
    stats.appendChild(statBox("Séries", ex.done + "/" + ex.sets, accent));
    card.appendChild(stats);

    var dots = el('<div class="dots"></div>');
    for (var i = 0; i < ex.sets; i++) {
      var filled = i < ex.done;
      var dot = el('<div class="dot">' + (filled ? "✓" : (i + 1)) + '</div>');
      if (filled) {
        dot.style.background = accent;
        dot.style.color = "var(--volt-ink)";
        dot.style.borderColor = accent;
      }
      dots.appendChild(dot);
    }
    card.appendChild(dots);

    if (ex.notes) {
      var note = el('<div class="notes">' + esc(ex.notes) + '</div>');
      note.style.borderLeftColor = accent;
      card.appendChild(note);
    }
    cardWrap.appendChild(card);
    root.appendChild(cardWrap);

    /* Timer de descanso */
    if (runtime.resting) {
      root.appendChild(buildRestTimer(ex));
    }

    /* Ação principal fixa */
    root.appendChild(buildFixedAction(ex, exDone, allDone, totalEx, accent));

    app.appendChild(root);

    // (re)inicia o tick se estiver descansando
    tickStart();
  }

  function statBox(label, value, accent) {
    var box = el('<div class="stat"></div>');
    box.appendChild(el('<div class="stat-label">' + esc(label) + '</div>'));
    var v = el('<div class="stat-value">' + esc(value) + '</div>');
    if (accent) v.style.color = accent;
    box.appendChild(v);
    return box;
  }

  function loadStat(value) {
    var box = el('<div class="stat"></div>');
    var labelRow = el('<div class="stat-label">Carga <span class="edit-link">editar</span></div>');
    box.appendChild(labelRow);
    var valueEl = el('<div class="stat-value" style="cursor:pointer">' + esc(value || "—") + '</div>');
    box.appendChild(valueEl);

    function enterEdit() {
      var input = el('<input class="stat-input" />');
      input.value = value == null ? "" : value;
      function commit() {
        patchEx({ loadUsed: input.value });
        renderRunner();
      }
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { commit(); }
      });
      box.replaceChild(input, valueEl);
      var link = labelRow.querySelector(".edit-link");
      if (link) link.style.visibility = "hidden";
      input.focus();
    }
    valueEl.addEventListener("click", enterEdit);
    labelRow.querySelector(".edit-link").addEventListener("click", enterEdit);
    return box;
  }

  function buildRestTimer(ex) {
    var R = 54, CIRC = 2 * Math.PI * R;
    var frac = runtime.total ? runtime.remaining / runtime.total : 0;
    var offset = CIRC * (1 - frac);

    var wrap = el('<div class="rest-timer"></div>');
    var inner = el('<div class="rt-inner"></div>');
    var cardHtml =
      '<div class="rest-card">' +
        '<div class="ring-wrap">' +
          '<svg width="132" height="132">' +
            '<circle cx="66" cy="66" r="' + R + '" fill="none" stroke="var(--border)" stroke-width="8"></circle>' +
            '<circle class="ring-progress" cx="66" cy="66" r="' + R + '" fill="none" stroke="var(--rest)" stroke-width="8" ' +
              'stroke-linecap="round" stroke-dasharray="' + CIRC + '" stroke-dashoffset="' + offset + '" ' +
              'style="transition:stroke-dashoffset 1s linear"></circle>' +
          '</svg>' +
          '<div class="ring-center">' +
            '<div class="ring-time">' + mmss(runtime.remaining) + '</div>' +
            '<div class="ring-label">' + (runtime.paused ? "PAUSADO" : "DESCANSO") + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="rest-controls">' +
          '<div class="rest-row">' +
            '<button class="ghost-btn" data-act="minus">−15s</button>' +
            '<button class="ghost-btn" data-act="plus">+15s</button>' +
          '</div>' +
          '<div class="rest-row">' +
            '<button class="rest-continue" data-act="toggle">' + (runtime.paused ? "▶ Continuar" : "❚❚ Pausar") + '</button>' +
            '<button class="ghost-btn" data-act="reset">↺</button>' +
          '</div>' +
          '<button class="ghost-btn rest-skip" data-act="skip">Pular descanso</button>' +
        '</div>' +
      '</div>';
    var cardEl = el(cardHtml);

    cardEl.querySelector('[data-act="minus"]').addEventListener("click", function () {
      runtime.remaining = Math.max(0, runtime.remaining - 15); updateRingDom();
    });
    cardEl.querySelector('[data-act="plus"]').addEventListener("click", function () {
      runtime.remaining = runtime.remaining + 15; updateRingDom();
    });
    cardEl.querySelector('[data-act="toggle"]').addEventListener("click", function () {
      runtime.paused = !runtime.paused;
      renderRunner();
    });
    cardEl.querySelector('[data-act="reset"]').addEventListener("click", function () {
      runtime.remaining = Number(ex.rest) || 0;
      runtime.paused = false;
      renderRunner();
    });
    cardEl.querySelector('[data-act="skip"]').addEventListener("click", function () {
      stopRest(); renderRunner();
    });

    inner.appendChild(cardEl);
    wrap.appendChild(inner);
    return wrap;
  }

  // Sombra semitransparente ~27% de opacidade para a cor de destaque atual
  function shadowFor(accentVar) {
    var map = {
      "var(--volt)": "rgba(198,241,53,.27)",
      "var(--rest)": "rgba(53,210,196,.27)",
      "var(--done)": "rgba(91,217,138,.27)"
    };
    return map[accentVar] || "rgba(0,0,0,.27)";
  }

  function buildFixedAction(ex, exDone, allDone, totalEx, accent) {
    var wrap = el('<div class="fixed-action"></div>');
    var inner = el('<div class="inner"></div>');

    if (!exDone) {
      var setBtn = el('<button class="complete-set-btn">CONCLUIR SÉRIE ' + (ex.done + 1) + '</button>');
      setBtn.style.background = accent;
      setBtn.style.boxShadow = "0 6px 24px " + shadowFor(accent);
      setBtn.addEventListener("click", completeSet);
      inner.appendChild(setBtn);

      if (ex.done > 0) {
        var undoBtn = el('<button class="ghost-btn ghost-full">↶ Desfazer última série</button>');
        undoBtn.addEventListener("click", undoSet);
        inner.appendChild(undoBtn);
      }
    } else {
      inner.appendChild(el('<div class="done-banner">✓ EXERCÍCIO CONCLUÍDO</div>'));
      var row = el('<div class="done-row"></div>');

      if (state.session.currentIndex > 0) {
        var prevBtn = ghost("←", function () { goTo(state.session.currentIndex - 1); });
        row.appendChild(prevBtn);
      }
      var undoBtn2 = ghost("↶", undoSet);
      row.appendChild(undoBtn2);

      if (state.session.currentIndex < totalEx - 1) {
        var nextBtn = el('<button class="next-btn">PRÓXIMO EXERCÍCIO →</button>');
        nextBtn.addEventListener("click", function () { goTo(state.session.currentIndex + 1); });
        row.appendChild(nextBtn);
      } else {
        var finishBtn = el('<button class="finish-btn">FINALIZAR TREINO 🏁</button>');
        finishBtn.disabled = !allDone;
        finishBtn.addEventListener("click", finishSession);
        row.appendChild(finishBtn);
      }
      inner.appendChild(row);

      if (!allDone && state.session.currentIndex === totalEx - 1) {
        inner.appendChild(el('<div class="pending-hint">Ainda há exercícios pendentes na trilha acima.</div>'));
      }
    }

    wrap.appendChild(inner);
    return wrap;
  }

  /* ============================================================
     HISTÓRICO
     ============================================================ */
  function renderHistory() {
    var root = el('<div style="padding-bottom:40px"></div>');

    var right = state.history.length
      ? ghost("Limpar", function () {
          if (confirm("Limpar todo o histórico?")) { state.history = []; saveHistory(); render(); }
        }, "danger")
      : null;

    root.appendChild(topbar({
      title: "Histórico",
      sub: state.history.length + " treinos registrados",
      left: ghost("←", function () { state.view = "home"; render(); }),
      right: right
    }));

    if (state.history.length === 0) {
      root.appendChild(el('<div class="big-empty">Nenhum treino finalizado ainda. Complete um treino e ele aparece aqui com data e cargas.</div>'));
      app.appendChild(root);
      return;
    }

    // agrupa por exercício
    var byExercise = {};
    state.history.forEach(function (h) {
      h.exercises.forEach(function (e) {
        (byExercise[e.name] = byExercise[e.name] || []).push({ date: h.date, load: e.load });
      });
    });

    // Evolução de carga
    var evoBlock = el('<div class="hist-block"></div>');
    evoBlock.appendChild(el('<div class="section-title">Evolução de carga</div>'));
    var evoList = el('<div class="col-gap"></div>');
    Object.keys(byExercise).forEach(function (name) {
      var arr = byExercise[name];
      var c = el('<div class="hist-card"></div>');
      c.appendChild(el('<div class="evo-name">' + esc(name) + '</div>'));
      var pts = el('<div class="evo-points"></div>');
      arr.slice(0, 8).reverse().forEach(function (p) {
        var pt = el('<div class="evo-point"></div>');
        pt.appendChild(el('<div class="evo-load">' + esc(p.load || "—") + '</div>'));
        pt.appendChild(el('<div class="evo-date">' + esc(fmtDate(p.date).replace(/ de \d+/, "")) + '</div>'));
        pts.appendChild(pt);
      });
      c.appendChild(pts);
      evoList.appendChild(c);
    });
    evoBlock.appendChild(evoList);
    root.appendChild(evoBlock);

    // Sessões
    var sessBlock = el('<div class="hist-block sessions"></div>');
    sessBlock.appendChild(el('<div class="section-title">Treinos realizados</div>'));
    var sessList = el('<div class="col-gap"></div>');
    state.history.forEach(function (h) {
      var c = el('<div class="hist-card"></div>');
      var head = el('<div class="sess-head"></div>');
      head.appendChild(el('<div class="sess-name">' + esc(h.name) + '</div>'));
      head.appendChild(el('<div class="sess-date">' + esc(fmtDate(h.date)) + '</div>'));
      c.appendChild(head);
      var exs = el('<div class="sess-exs"></div>');
      h.exercises.forEach(function (e) {
        var line = el('<div class="sess-ex"></div>');
        line.appendChild(el('<span>' + esc(e.name) + '</span>'));
        line.appendChild(el('<span class="load">' + esc(e.sets) + '× · ' + esc(e.load || "—") + '</span>'));
        exs.appendChild(line);
      });
      c.appendChild(exs);
      sessList.appendChild(c);
    });
    sessBlock.appendChild(sessList);
    root.appendChild(sessBlock);

    app.appendChild(root);
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    var w = store.get("workouts");
    var h = store.get("history");
    var s = store.get("activeSession");
    state.workouts = (w && w.length) ? w : seedWorkouts();
    state.history = h || [];
    if (s) { state.session = s; state.view = "run"; }
    save();
    render();
  }

  boot();
})();
