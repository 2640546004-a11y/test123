/* 树洞自律小刺猬 Web 1.0 - 阶段 2.6/2.7/2.8 完整实现
 * - LocalStorage：28 条疗愈文案池 + 解锁信件落库（healing_letters_db）
 * - 信箱页：倒序列表 + 详情弹窗（关闭后精准回到母页并保留滚动）
 * - 音频系统：多音轨统一 25% 音量锁死 + home/zen BGM 淡入淡出 + 全局点击音效
 * - 多媒体防御：video/audio onerror 不阻塞主流程，自动后备
 */

(() => {
  "use strict";

  /** =========================
   * DOM
   * ========================= */
  const el = {
    home: document.getElementById("home-state"),
    zen: document.getElementById("zen-state"),
    mailbox: document.getElementById("mailbox-state"),

    bgVideo: document.getElementById("bg-video"),

    btnStart: document.getElementById("btn-start"),
    btnMailbox: document.getElementById("icon-mailbox"),
    btnBack: document.getElementById("btn-back"),

    timeButtons: Array.from(document.querySelectorAll(".home-time-btn")),
    zenTimer: document.getElementById("zen-timer"),

    homeStats: document.querySelector("#home-stats .stats-text"),
    mailboxStats: document.querySelector("#mailbox-stats .stats-text"),
    panelLettersCount: document.getElementById("panel-letters-count"),
    panelFocusMinutes: document.getElementById("panel-focus-minutes"),

    mailboxList: document.getElementById("mailbox-letter-list"),
    mailboxReader: document.getElementById("mailbox-reader"),

    successPopup: document.getElementById("success-popup"),
    successClose: document.getElementById("success-close"),
    successBody: document.getElementById("success-letter-body"),

    letterPopup: document.getElementById("letter-popup"),
    letterPopupClose: document.getElementById("letter-popup-close"),
    letterPopupBody: document.getElementById("letter-popup-body"),

    audioHome: document.getElementById("home-bgm"),
    audioZen: document.getElementById("zen-bgm"),
    audioClick: document.getElementById("click-sfx"),
  };

  /** =========================
   * 常量
   * ========================= */
  const VOLUME_LOCK = 0.25;

  const STATE = {
    HOME: "HOME",
    ZEN: "ZEN",
    MAILBOX: "MAILBOX",
  };

  const VIDEO = {
    HOME: "./assets/videos/home-bg.mp4",
    START_RUN: "./assets/videos/start-run.mp4",
    RUNNING_LOOP: "./assets/videos/running-loop.mp4",
    GO_HOME: "./assets/videos/go-home.mp4",
  };

  const POSTER = {
    HOME: "./assets/images/poster-home.jpg",
    ZEN: "./assets/images/poster-zen.jpg",
  };

  const AUDIO = {
    HOME_BGM: "./assets/audio/home-bgm.mp3",
    ZEN_BGM: "./assets/audio/zen-bgm.mp3",
    CLICK: "./assets/audio/click.mp3",
  };

  const resolveAssetUrl = (relativePath) => {
    try {
      return new URL(relativePath, document.baseURI || window.location.href).href;
    } catch {
      return relativePath;
    }
  };

  const initAudioSources = () => {
    const bindings = [
      [el.audioHome, AUDIO.HOME_BGM],
      [el.audioZen, AUDIO.ZEN_BGM],
      [el.audioClick, AUDIO.CLICK],
    ];
    for (const [node, path] of bindings) {
      if (!node || !path) continue;
      const resolved = resolveAssetUrl(path);
      if (node.src !== resolved) node.src = resolved;
    }
  };

  const STORAGE = {
    lettersDb: "healing_letters_db",
    userStats: "user_stats",
    lettersCountCompat: "unlocked_letters_count", // 兼容字段（PRD/历史）
  };

  // 任务 2.6：28 条疗愈文案池（每条 < 200 字）
  const HEALING_POOL = [
    "辛苦啦。你能把注意力放回当下，就已经很勇敢了。去喝口水，慢慢把肩膀放松下来吧。",
    "今天的你很认真。哪怕只是短短一段专注，也是在为自己点亮一盏小灯。",
    "别急着否定自己。你已经往前走了，而且走得很踏实。现在允许自己休息一下。",
    "你做到了。不是因为你不疲惫，而是你愿意温柔地坚持。谢谢你照顾自己。",
    "把这一段时间收进心里：你有能力回到专注，也有能力回到平静。",
    "我看到你在努力了。就算进度很慢，也依然算数。慢慢来，我们一起回家。",
    "完成啦。先深呼吸三次，再去做下一件事吧。你值得被温柔对待。",
    "你不是懒，你只是需要一点点方向。今天你找回方向了，很了不起。",
    "专注不是硬撑，而是一次次轻轻地把心带回来。你已经做得很好了。",
    "谢谢你没有放弃自己。每一次开始，都在证明你仍然相信未来。",
    "别怕走得慢。你只要不停下来，就一直在靠近想要的生活。",
    "你刚刚把时间交给了重要的事。现在把温柔也交给自己，好吗？",
    "今天的努力不会立刻开花，但它已经在土里扎根了。继续相信自己。",
    "你认真专注的样子，很闪闪发光。把这份光留给今天的你。",
    "你已经完成了一次小小的胜利。接下来，就让心安静一会儿。",
    "辛苦了。放下屏幕，看看远处，再回来。你会更轻松、更清醒。",
    "你做的每一步都不白费。把“我可以”放在心里，轻轻说一遍。",
    "这段专注很珍贵。它不需要被谁看见，只需要你自己知道：你正在变好。",
    "慢慢来，不用完美。你愿意开始，就已经超越了昨天的焦虑。",
    "你把自己从杂乱里捡回来了。谢谢你愿意为自己做这件事。",
    "完成啦。给自己一个小小奖励：伸伸懒腰，喝口水，眨眨眼睛。",
    "你已经很努力了。请把“应该”放下，把“可以”捧在手心。",
    "你做得很好。即使今天很难，你也依然选择了继续前进。",
    "谢谢你陪我跑完这一段路。我们都更靠近那个更自由的自己了。",
    "你值得被夸奖：你专注、你坚定、你也很温柔。继续保持这份温柔。",
    "别把自己逼得太紧。专注结束了，呼吸开始了。把心放松一点吧。",
    "你完成了。把这份踏实收好，明天它会成为你的底气。",
    "你不是一个人在坚持。每一次专注，都有人在心里为你鼓掌。",
  ];

  /** =========================
   * 全局状态
   * ========================= */
  let activeState = STATE.HOME;
  let currentDuration = 25; // 分钟（默认 25）
  let wakeLock = null;

  // 倒计时（时间戳差值校验法）
  let targetTime = 0;
  let lastShownSeconds = null;
  let ticker = null; // {type:'worker'|'interval', worker?, intervalId?}
  let tickFn = null;

  // 信箱 UI
  let activeLetterId = null;
  let mailboxScrollTop = 0;

  /** =========================
   * 工具函数
   * ========================= */
  const pad2 = (n) => String(n).padStart(2, "0");

  const formatMMSS = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${pad2(m)}:${pad2(sec)}`;
  };

  const formatLocalDate = (d = new Date()) => {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
  };

  const safeJsonParse = (raw, fallback) => {
    if (raw == null || raw === "") return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const createLetterId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `let_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    }
    return `let_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-4)}`;
  };

  const splitToParagraphs = (text) =>
    String(text || "")
      .split(/\n{2,}/g)
      .map((s) => s.trim())
      .filter(Boolean);

  /** =========================
   * 多媒体：音量锁死 25% + 点击音效 + BGM 淡入淡出
   * ========================= */
  const clampVolume = (v) => Math.max(0, Math.min(VOLUME_LOCK, v));

  const lockVolume = (media) => {
    if (!media) return;
    media.volume = VOLUME_LOCK;
  };

  const safePlay = async (media) => {
    if (!media) return false;
    if (!media.src && !media.currentSrc) return false;
    lockVolume(media);
    try {
      if (media.readyState < 2) {
        await new Promise((resolve) => {
          const done = () => {
            media.removeEventListener("canplay", done);
            media.removeEventListener("error", done);
            resolve();
          };
          media.addEventListener("canplay", done, { once: true });
          media.addEventListener("error", done, { once: true });
          try {
            media.load();
          } catch {
            resolve();
          }
        });
      }
      const p = media.play();
      // 任务 2.8 / PRD 异常防御：必须捕获 autoplay/策略拦截，绝不阻塞主流程
      if (p && typeof p.catch === "function") {
        p.catch((error) => {
          if (error && error.name === "AbortError") return;
          console.warn("音频播放被拦截或未加载:", error);
        });
      }
      await p;
      lockVolume(media);
      return true;
    } catch (error) {
      if (error && error.name === "AbortError") return false;
      return false;
    }
  };

  const safePause = (media) => {
    if (!media) return;
    try {
      media.pause();
    } catch {
      // ignore
    }
  };

  const fadeAudio = (media, to, durationMs, { pauseAtEnd = false } = {}) =>
    new Promise((resolve) => {
      if (!media) return resolve();
      const from = clampVolume(media.volume ?? VOLUME_LOCK);
      const target = clampVolume(to);
      const start = performance.now();

      const step = (now) => {
        const p = Math.min(1, (now - start) / Math.max(1, durationMs));
        const v = from + (target - from) * p;
        media.volume = clampVolume(v);
        if (p < 1) {
          requestAnimationFrame(step);
          return;
        }
        media.volume = clampVolume(target);
        if (pauseAtEnd && target <= 0) safePause(media);
        resolve();
      };
      requestAnimationFrame(step);
    });

  const playClick = () => {
    if (!el.audioClick) return;
    const clickSound = el.audioClick.cloneNode(true);
    clickSound.volume = VOLUME_LOCK;
    const p = clickSound.play();
    if (p && typeof p.catch === "function") {
      p.catch((error) => {
        console.log("播放受阻:", error);
      });
    }
    clickSound.addEventListener(
      "ended",
      () => {
        clickSound.remove();
      },
      { once: true }
    );
  };

  const startHomeBgm = async ({ fadeIn = true } = {}) => {
    if (!el.audioHome) return;
    el.audioHome.loop = true;
    if (fadeIn) el.audioHome.volume = 0;
    lockVolume(el.audioHome);
    await safePlay(el.audioHome);
    if (fadeIn) await fadeAudio(el.audioHome, VOLUME_LOCK, 500);
  };

  const stopHomeBgm = async ({ fadeOut = true } = {}) => {
    if (!el.audioHome) return;
    lockVolume(el.audioHome);
    if (fadeOut) {
      await fadeAudio(el.audioHome, 0, 500, { pauseAtEnd: true });
    } else {
      safePause(el.audioHome);
    }
  };

  const startZenBgm = async ({ fadeIn = true } = {}) => {
    if (!el.audioZen) return;
    el.audioZen.loop = true;
    if (fadeIn) el.audioZen.volume = 0;
    lockVolume(el.audioZen);
    await safePlay(el.audioZen);
    if (fadeIn) await fadeAudio(el.audioZen, VOLUME_LOCK, 500);
  };

  const stopZenBgm = async ({ fadeOut = false } = {}) => {
    if (!el.audioZen) return;
    lockVolume(el.audioZen);
    if (fadeOut) {
      await fadeAudio(el.audioZen, 0, 300, { pauseAtEnd: true });
    } else {
      safePause(el.audioZen);
    }
    // 重置进度，确保下次进入专注从头淡入
    try {
      el.audioZen.currentTime = 0;
    } catch {
      // ignore
    }
  };

  const bindMediaErrorDefense = () => {
    // video / audio error：不阻塞主流程，仅开启后备 UI（PRD 5.1）
    el.bgVideo?.addEventListener("error", () => {
      document.documentElement.classList.add("video-error");
    });
    el.audioHome?.addEventListener("error", () => {});
    el.audioZen?.addEventListener("error", () => {});
    el.audioClick?.addEventListener("error", () => {});
  };

  /** =========================
   * 视频控制（同一个 <video> 元素）
   * ========================= */
  let runningLoopPreload = null;
  let runningLoopPreloadReady = false;

  const moveVideoTo = (container) => {
    if (!el.bgVideo || !container) return;
    if (el.bgVideo.parentElement !== container) container.prepend(el.bgVideo);
  };

  const applyVideoFlags = (video, { loop = false, muted = true } = {}) => {
    if (!video) return;
    video.loop = Boolean(loop);
    video.muted = Boolean(muted);
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";
  };

  const waitVideoEvent = (video, eventName, timeoutMs = 8000) =>
    new Promise((resolve) => {
      if (!video) return resolve(false);
      if (eventName === "canplaythrough" && video.readyState >= 4) return resolve(true);
      if (eventName === "canplay" && video.readyState >= 3) return resolve(true);

      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        video.removeEventListener(eventName, onOk);
        clearTimeout(timer);
        resolve(ok);
      };
      const onOk = () => finish(true);
      const timer = window.setTimeout(() => finish(false), timeoutMs);
      video.addEventListener(eventName, onOk, { once: true });
    });

  const preloadVideoSrc = async (src) => {
    runningLoopPreloadReady = false;
    if (!src) return false;

    if (!runningLoopPreload) {
      runningLoopPreload = document.createElement("video");
      runningLoopPreload.style.cssText =
        "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
      runningLoopPreload.setAttribute("aria-hidden", "true");
      document.body.appendChild(runningLoopPreload);
    }

    applyVideoFlags(runningLoopPreload, { loop: true, muted: true });
    runningLoopPreload.src = src;
    runningLoopPreload.load();
    const ok = await waitVideoEvent(runningLoopPreload, "canplaythrough");
    runningLoopPreloadReady = ok;
    return ok;
  };

  const playVideoWhenReady = async (video) => {
    if (!video) return;
    if (video.readyState < 3) await waitVideoEvent(video, "canplay", 8000);
    try {
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch((error) => {
          console.warn("视频播放被拦截或未加载:", error);
        });
      }
      await p;
      video.volume = clampVolume(video.volume);
    } catch {
      // 静默：若被策略拦截则保持 poster/底色
    }
  };

  const setVideoSource = async (src, { loop, poster, muted, volume } = {}) => {
    if (!el.bgVideo) return;

    try {
      el.bgVideo.pause();
    } catch {
      // ignore
    }

    if (typeof muted === "boolean") el.bgVideo.muted = muted;
    if (typeof volume === "number") el.bgVideo.volume = clampVolume(volume);
    else el.bgVideo.volume = VOLUME_LOCK; // 音量锁死（包含 go-home 原声音轨）

    applyVideoFlags(el.bgVideo, { loop: Boolean(loop), muted: el.bgVideo.muted });
    if (poster) el.bgVideo.poster = poster;
    el.bgVideo.src = src;
    el.bgVideo.load();

    await playVideoWhenReady(el.bgVideo);
  };

  const videoHasSrc = (video, src) => {
    const current = video.currentSrc || video.src || "";
    if (!current) return false;
    try {
      return new URL(current).href === new URL(src, window.location.href).href;
    } catch {
      return current.includes(src.replace(/^\.\//, ""));
    }
  };

  const transitionToRunningLoop = async () => {
    if (!el.bgVideo) return;

    const poster = POSTER.ZEN;
    if (poster) el.bgVideo.poster = poster;

    applyVideoFlags(el.bgVideo, { loop: true, muted: true });
    el.bgVideo.volume = VOLUME_LOCK;

    if (!runningLoopPreloadReady) {
      await preloadVideoSrc(VIDEO.RUNNING_LOOP);
    }

    if (!videoHasSrc(el.bgVideo, VIDEO.RUNNING_LOOP)) {
      el.bgVideo.src = VIDEO.RUNNING_LOOP;
      el.bgVideo.load();
    }

    await playVideoWhenReady(el.bgVideo);
  };

  /** =========================
   * LocalStorage（任务 2.6）
   * ========================= */
  const getUserStats = () => {
    const stats = safeJsonParse(localStorage.getItem(STORAGE.userStats), {});
    if (!Number.isFinite(stats.total_focus_minutes)) stats.total_focus_minutes = 0;
    if (!Number.isFinite(stats.total_letters_count)) stats.total_letters_count = 0;
    return stats;
  };

  const setUserStats = (stats) => {
    localStorage.setItem(STORAGE.userStats, JSON.stringify(stats));
    // 兼容字段同步
    localStorage.setItem(STORAGE.lettersCountCompat, String(stats.total_letters_count || 0));
  };

  const getLettersDb = () => {
    const raw = localStorage.getItem(STORAGE.lettersDb);
    const arr = safeJsonParse(raw, []);
    return Array.isArray(arr) ? arr : [];
  };

  const setLettersDb = (arr) => {
    localStorage.setItem(STORAGE.lettersDb, JSON.stringify(arr));
  };

  const initStorage = () => {
    // 修复/初始化 user_stats
    setUserStats(getUserStats());
    // 修复/初始化信件库
    setLettersDb(getLettersDb());
  };

  const pickHealingTextNoRepeat = () => {
    const db = getLettersDb();
    const recent = [...db].slice(-7).map((x) => x.content_text).filter(Boolean);
    const candidates = HEALING_POOL.filter((t) => !recent.includes(t));
    const pool = candidates.length > 0 ? candidates : HEALING_POOL;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const appendLetterAndUpdateStats = (letter) => {
    const db = getLettersDb();
    const nextDb = [...db, letter];

    try {
      setLettersDb(nextDb);
    } catch (e) {
      // PRD 5.3：配额爆满 → 覆盖最早的一封
      if (e && e.name === "QuotaExceededError" && nextDb.length > 0) {
        nextDb.shift();
        setLettersDb(nextDb);
      }
    }

    const stats = getUserStats();
    stats.total_letters_count = (stats.total_letters_count || 0) + 1;
    stats.total_focus_minutes = (stats.total_focus_minutes || 0) + currentDuration;
    setUserStats(stats);
  };

  /** =========================
   * 渲染：统计胶囊 / 信箱列表 / 阅读区
   * ========================= */
  const renderStats = () => {
    const stats = getUserStats();
    const count = stats.total_letters_count || 0;
    const minutes = stats.total_focus_minutes || 0;

    // BUG1 修复：叶子 icon 文案动态绑定（仅信箱页显示）
    if (el.mailboxStats) el.mailboxStats.textContent = `已收集 ${count} 封信`;

    // 统计看板：累计收集数量与总专注时长
    if (el.panelLettersCount) el.panelLettersCount.textContent = String(count);
    if (el.panelFocusMinutes) el.panelFocusMinutes.textContent = String(minutes);

    // 若首页存在统计位（未来可能回归），也保持兼容更新
    if (el.homeStats) el.homeStats.textContent = `${count} / ${minutes}`;
  };

  const renderPaperBody = (container, contentText) => {
    if (!container) return;
    container.innerHTML = "";
    const paragraphs = splitToParagraphs(contentText);
    if (paragraphs.length === 0) {
      const p = document.createElement("p");
      p.textContent = "";
      container.appendChild(p);
      return;
    }
    for (const para of paragraphs) {
      const p = document.createElement("p");
      p.textContent = para;
      container.appendChild(p);
    }
  };

  const renderReader = (letter) => {
    if (!el.mailboxReader) return;
    el.mailboxReader.innerHTML = "";

    if (!letter) {
      const p = document.createElement("p");
      p.textContent = "点击左侧的信件条目，即可在这里阅读与在弹窗中查看完整原文。";
      el.mailboxReader.appendChild(p);
      return;
    }

    const meta = document.createElement("div");
    meta.className = "reader-meta";
    meta.textContent = `${letter.unlocked_time} · ${letter.duration_tag}分钟的陪伴`;
    el.mailboxReader.appendChild(meta);

    const p = document.createElement("p");
    p.textContent = letter.content_text || "";
    el.mailboxReader.appendChild(p);
  };

  const renderMailbox = () => {
    if (!el.mailboxList) return;
    const db = getLettersDb();
    el.mailboxList.innerHTML = "";

    if (db.length === 0) {
      const empty = document.createElement("div");
      empty.className = "mailbox-letter-empty";
      empty.textContent = "当前信箱空空如也，快去开启第一次专注吧~";
      el.mailboxList.appendChild(empty);
      renderReader(null);
      activeLetterId = null;
      return;
    }

    const list = [...db].reverse(); // 最新在前
    if (!activeLetterId) activeLetterId = list[0].letter_id;

    for (const item of list) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mailbox-letter-item";
      btn.dataset.letterId = item.letter_id;
      btn.textContent = `${item.unlocked_time} · ${item.duration_tag}分钟的陪伴`;

      btn.addEventListener("click", async () => {
        activeLetterId = item.letter_id;
        renderMailbox(); // 更新 active 高亮 + 右侧阅读区
        await openLetterPopup(item);
      });

      if (item.letter_id === activeLetterId) btn.classList.add("is-active");
      el.mailboxList.appendChild(btn);
    }

    const selected = db.find((x) => x.letter_id === activeLetterId) || list[0];
    renderReader(selected);
  };

  /** =========================
   * 弹窗：成功结算 / 信箱信件详情
   * ========================= */
  const showSuccessPopup = (contentText) => {
    if (!el.successPopup) return;
    renderPaperBody(el.successBody, contentText);
    el.successPopup.hidden = false;
  };

  const hideSuccessPopup = () => {
    if (!el.successPopup) return;
    el.successPopup.hidden = true;
    if (el.successBody) el.successBody.innerHTML = "";
  };

  const openLetterPopup = async (letter) => {
    if (!el.letterPopup) return;
    if (el.mailboxList) mailboxScrollTop = el.mailboxList.scrollTop;
    renderPaperBody(el.letterPopupBody, letter.content_text);
    el.letterPopup.hidden = false;
  };

  const closeLetterPopup = () => {
    if (!el.letterPopup) return;
    el.letterPopup.hidden = true;
    if (el.letterPopupBody) el.letterPopupBody.innerHTML = "";
    // 关键：回到母页并保留滚动位置
    if (el.mailboxList) el.mailboxList.scrollTop = mailboxScrollTop;
  };

  /** =========================
   * 状态显示（CSS display:none / block）
   * ========================= */
  const getStateEl = (s) => {
    if (s === STATE.HOME) return el.home;
    if (s === STATE.ZEN) return el.zen;
    if (s === STATE.MAILBOX) return el.mailbox;
    return null;
  };

  const showStateInstant = (next) => {
    activeState = next;
    if (el.home) el.home.style.display = next === STATE.HOME ? "block" : "none";
    if (el.zen) el.zen.style.display = next === STATE.ZEN ? "block" : "none";
    if (el.mailbox) el.mailbox.style.display = next === STATE.MAILBOX ? "block" : "none";
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const showStateFade = async (next, durationMs = 320) => {
    if (activeState === next) return;
    const fromEl = getStateEl(activeState);
    const toEl = getStateEl(next);
    if (!toEl) return showStateInstant(next);

    // 先展示目标页（透明），再触发渐入
    toEl.style.display = "block";
    toEl.style.opacity = "0";
    requestAnimationFrame(() => {
      toEl.style.opacity = "1";
    });

    // 当前页渐出
    if (fromEl) fromEl.classList.add("is-fade-out");
    await wait(durationMs);

    // 完成切换
    if (fromEl) {
      fromEl.classList.remove("is-fade-out");
      fromEl.style.display = "none";
    }
    toEl.style.opacity = "";

    activeState = next;
  };

  /** =========================
   * Wake Lock（后台保活辅助）
   * ========================= */
  const requestWakeLock = async () => {
    try {
      if (!("wakeLock" in navigator)) return;
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    } catch {
      wakeLock = null;
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLock) await wakeLock.release();
    } catch {
      // ignore
    } finally {
      wakeLock = null;
    }
  };

  /** =========================
   * 高精度倒计时（任务 2.4/2.6 联动）
   * ========================= */
  const createTicker = (onTick) => {
    if (typeof Worker === "function") {
      const blob = new Blob(
        [
          "let t=null; onmessage=(e)=>{",
          "  if(e.data==='start'){ if(t)clearInterval(t); t=setInterval(()=>postMessage('tick'),250); }",
          "  if(e.data==='stop'){ if(t)clearInterval(t); t=null; }",
          "};",
        ],
        { type: "text/javascript" }
      );
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = () => onTick();
      worker.postMessage("start");
      return { type: "worker", worker };
    }
    const intervalId = window.setInterval(onTick, 250);
    return { type: "interval", intervalId };
  };

  const stopTicker = () => {
    if (!ticker) return;
    try {
      if (ticker.type === "worker") {
        ticker.worker.postMessage("stop");
        ticker.worker.terminate();
      } else {
        clearInterval(ticker.intervalId);
      }
    } catch {
      // ignore
    } finally {
      ticker = null;
    }
  };

  const stopCountdown = () => {
    stopTicker();
    tickFn = null;
    targetTime = 0;
    lastShownSeconds = null;
  };

  const startCountdown = (minutes, onFinish) => {
    stopCountdown();
    const durationMs = Math.max(0, Math.floor(minutes * 60 * 1000));
    targetTime = Date.now() + durationMs;
    lastShownSeconds = null;

    if (el.zenTimer) {
      el.zenTimer.style.display = "block";
      el.zenTimer.textContent = `${pad2(minutes)}:00`;
    }

    tickFn = () => {
      const remainMs = targetTime - Date.now();
      const remainSeconds = Math.max(0, Math.ceil(remainMs / 1000));
      if (remainSeconds !== lastShownSeconds) {
        lastShownSeconds = remainSeconds;
        if (el.zenTimer) el.zenTimer.textContent = formatMMSS(remainSeconds);
      }
      if (remainMs <= 0) {
        stopCountdown();
        onFinish?.();
      }
    };

    tickFn();
    ticker = createTicker(tickFn);
  };

  document.addEventListener("visibilitychange", () => {
    // 回到前台立即校正 + 重新申请 WakeLock（部分浏览器会释放）
    if (document.visibilityState === "visible" && typeof tickFn === "function") tickFn();
    if (document.visibilityState === "visible" && activeState === STATE.ZEN) requestWakeLock();
  });

  /** =========================
   * 全屏：失败静默降级为网页内全屏
   * ========================= */
  const tryEnterFullscreen = async () => {
    const root = document.documentElement;
    if (root.requestFullscreen) {
      try {
        await root.requestFullscreen();
        document.body.classList.remove("is-web-fullscreen");
        return true;
      } catch {
        document.body.classList.add("is-web-fullscreen");
        return false;
      }
    }
    document.body.classList.add("is-web-fullscreen");
    return false;
  };

  const tryExitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
    document.body.classList.remove("is-web-fullscreen");
  };

  /** =========================
   * 核心状态流：HOME / ZEN / MAILBOX
   * ========================= */
  const enterHome = async ({ resumeBgm = true } = {}) => {
    stopCountdown();
    await releaseWakeLock();

    closeLetterPopup();
    hideSuccessPopup();
    document.body.classList.remove("is-story");

    moveVideoTo(el.home);
    // MAILBOX → HOME：平滑淡出切换；ZEN → HOME：直接切换（避免全屏退出时视觉抖动）
    if (activeState === STATE.MAILBOX) await showStateFade(STATE.HOME);
    else showStateInstant(STATE.HOME);
    renderStats();

    if (el.bgVideo) el.bgVideo.onended = null;
    await setVideoSource(VIDEO.HOME, { loop: true, poster: POSTER.HOME, muted: true, volume: VOLUME_LOCK });

    await stopZenBgm({ fadeOut: false });
    if (resumeBgm) await startHomeBgm({ fadeIn: true });
  };

  const enterMailbox = async () => {
    stopCountdown();
    await releaseWakeLock();
    hideSuccessPopup();
    document.body.classList.remove("is-story");

    // HOME → MAILBOX：平滑淡出切换（任务 2.7 要求）
    if (activeState === STATE.HOME) await showStateFade(STATE.MAILBOX);
    else showStateInstant(STATE.MAILBOX);
    renderStats();
    renderMailbox();

    // 信箱页常驻 home-bgm（25%）
    await stopZenBgm({ fadeOut: false });
    await startHomeBgm({ fadeIn: false });
  };

  const exitZenToHomeFail = async () => {
    await stopZenBgm({ fadeOut: false });
    await tryExitFullscreen();
    await enterHome({ resumeBgm: true });
  };

  const enterZen = async () => {
    // home-bgm 0.5 秒淡出并暂停；zen-bgm 淡入（PRD 3.1/3.2）
    await stopHomeBgm({ fadeOut: true });
    await tryEnterFullscreen();

    closeLetterPopup();
    hideSuccessPopup();
    document.body.classList.remove("is-story");

    // 关键修复：必须先切换状态，立即隐藏 HOME（display:none），避免首页 UI 残留叠层
    showStateInstant(STATE.ZEN);
    moveVideoTo(el.zen);

    if (el.zenTimer) {
      el.zenTimer.style.display = "block";
      el.zenTimer.textContent = `${pad2(currentDuration)}:00`;
    }

    await requestWakeLock();
    await startZenBgm({ fadeIn: true });

    // 起跑（一次）；并行预加载奔跑循环，减少 onended 切换空帧
    runningLoopPreloadReady = false;
    void preloadVideoSrc(VIDEO.RUNNING_LOOP);

    if (el.bgVideo) {
      el.bgVideo.onended = null;
      el.bgVideo.ontimeupdate = null;
    }
    await setVideoSource(VIDEO.START_RUN, { loop: false, poster: POSTER.ZEN, muted: true, volume: VOLUME_LOCK });

    // 起跑结束 → 奔跑循环 → 启动倒计时
    if (el.bgVideo) {
      el.bgVideo.ontimeupdate = () => {
        const d = el.bgVideo.duration;
        if (!Number.isFinite(d) || d <= 0) return;
        if (d - el.bgVideo.currentTime <= 0.3 && !runningLoopPreloadReady) {
          void preloadVideoSrc(VIDEO.RUNNING_LOOP);
        }
      };

      el.bgVideo.onended = async () => {
        if (!el.bgVideo) return;
        el.bgVideo.onended = null;
        el.bgVideo.ontimeupdate = null;
        await transitionToRunningLoop();
        startCountdown(currentDuration, onCountdownFinishSuccess);
      };
    }
  };

  /** =========================
   * 专注成功：go-home 串联 → 弹窗 → 回首页
   * ========================= */
  const onCountdownFinishSuccess = async () => {
    if (el.zenTimer) el.zenTimer.style.display = "none";

    // 倒计时归零：立刻切断 zen-bgm（PRD 3.2）
    await stopZenBgm({ fadeOut: false });

    // go-home 播放期间屏蔽误触
    document.body.classList.add("is-story");

    if (el.bgVideo) el.bgVideo.onended = null;
    await setVideoSource(VIDEO.GO_HOME, { loop: false, poster: POSTER.ZEN, muted: false, volume: VOLUME_LOCK });

    if (el.bgVideo) {
      el.bgVideo.onended = () => {
        // 播放结束：保持最后一帧作为底图（video 不销毁）
        document.body.classList.remove("is-story");

        const content = pickHealingTextNoRepeat();
        const letter = {
          letter_id: createLetterId(),
          content_text: content,
          unlocked_time: formatLocalDate(new Date()),
          duration_tag: currentDuration,
        };

        appendLetterAndUpdateStats(letter);
        renderStats();
        renderMailbox();
        showSuccessPopup(content);
      };
    }
  };

  const closeSuccessAndReturnHome = async () => {
    hideSuccessPopup();
    await tryExitFullscreen();
    await enterHome({ resumeBgm: true });
  };

  /** =========================
   * 时间轴：时长切换
   * ========================= */
  const setActiveDuration = (minutes) => {
    currentDuration = minutes;
    for (const btn of el.timeButtons) {
      const m = Number(btn.dataset.minutes);
      btn.classList.toggle("is-active", m === minutes);
    }
  };

  /** =========================
   * 事件绑定
   * ========================= */
  const bindEvents = () => {
    bindMediaErrorDefense();

    // 全局所有可点击按钮：触发点击音效（25%）
    document.addEventListener(
      "pointerdown",
      (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("button") : null;
        if (!btn) return;
        playClick();
      },
      true
    );

    // 时间轴五个数字
    for (const btn of el.timeButtons) {
      btn.addEventListener("click", () => {
        if (activeState !== STATE.HOME) return;
        const minutes = Number(btn.dataset.minutes);
        if (!Number.isFinite(minutes)) return;
        setActiveDuration(minutes);
      });
    }

    // START → 专注流
    el.btnStart?.addEventListener("click", () => {
      if (activeState !== STATE.HOME) return;
      enterZen();
    });

    // 首页邮箱 → 信箱页（home-bgm 保持循环）
    el.btnMailbox?.addEventListener("click", () => {
      if (activeState !== STATE.HOME) return;
      enterMailbox();
    });

    // 信箱返回 → 首页
    el.btnBack?.addEventListener("click", () => {
      if (activeState !== STATE.MAILBOX) return;
      enterHome({ resumeBgm: true });
    });

    // 成功弹窗关闭：回首页并唤醒 home-bgm
    el.successClose?.addEventListener("click", () => {
      closeSuccessAndReturnHome();
    });

    // 信箱信件弹窗关闭：回信箱母页（保留滚动）
    el.letterPopupClose?.addEventListener("click", () => {
      closeLetterPopup();
    });

    // ESC 行为（PRD 3.2 + 2.7 弹窗焦点）
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (activeState === STATE.ZEN) {
        // 弹窗打开：ESC 视作关闭弹窗
        if (el.successPopup && !el.successPopup.hidden) {
          closeSuccessAndReturnHome();
          return;
        }
        // 禅定中途退出视为失败：返回首页 + 恢复 home-bgm
        exitZenToHomeFail();
        return;
      }

      // 信箱信件弹窗：ESC 关闭但不跳首页
      if (activeState === STATE.MAILBOX && el.letterPopup && !el.letterPopup.hidden) {
        closeLetterPopup();
      }
    });
  };

  /** =========================
   * 初始化
   * ========================= */
  const init = async () => {
    initStorage();
    initAudioSources();
    bindEvents();

    // 初始化音量锁死（即使浏览器策略拦截播放，也要锁定 volume 值）
    lockVolume(el.audioHome);
    lockVolume(el.audioZen);
    lockVolume(el.audioClick);
    lockVolume(el.bgVideo);

    // 默认 25 高亮
    setActiveDuration(25);

    renderStats();
    renderMailbox();

    // 默认进入首页：home 视频静音循环 + home-bgm 尝试自动播放
    await enterHome({ resumeBgm: false });
    await startHomeBgm({ fadeIn: false });

    // 若浏览器阻止自动播放：在首次用户交互后自动补偿唤醒 home-bgm
    document.addEventListener(
      "pointerdown",
      () => {
        if (activeState === STATE.HOME) startHomeBgm({ fadeIn: false });
      },
      { once: true, capture: true }
    );
  };

  init();
})();
