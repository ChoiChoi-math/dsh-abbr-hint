window.__ModuleLoader__.load({
  id: 'dsh-abbr-hint',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;

    /* ------------------------------------------------------------------ */
    /* Constants                                                           */
    /* ------------------------------------------------------------------ */

    const STORE_KEY = 'dsh-abbr-hint.v1';
    const CSS_TAG_ID = 'dsh-abbr-hint/client.css';
    const HL_KNOWN = 'dsh-abbr-hint-known';
    const HL_UNKNOWN = 'dsh-abbr-hint-unknown';
    const CARD_ATTR = 'data-dsh-abbr-card';
    const CARD_SELECTOR = '[' + CARD_ATTR + ']';
    const MENU_ATTR = 'data-dsh-abbr-menu';
    const MENU_SELECTOR = '[' + MENU_ATTR + ']';
    const EXPLAIN_URL = '/api/abbr-hint.explain';
    const FILL_URL = '/api/abbr-hint.fill';
    const PING_URL = '/api/abbr-hint.ping';
    const ASK_DEFAULT = '请更详细地解释它：具体指什么、为什么需要它、常见的使用场景。';
    /** Tokens that are words rather than abbreviations; never auto-fill them. */
    const NO_AUTO = { ok: true, am: true, pm: true, yes: true, no: true };
    const AUTO_BATCH = 6;
    const AUTO_BUDGET = 60;
    const AUTO_CONCURRENCY = 2;

    /** Only rendered assistant replies are decorated. */
    const SCOPE_SELECTOR = '[data-conversation-scroll]';
    const STEP_SELECTOR = '[data-chat-flow-kind="assistant-step"]';
    const FLOW_FALLBACK = '[data-chat-flow]:not([data-chat-flow-kind="user"]):not([data-chat-flow-kind="steering"])';

    /** Text that is never decorated: block code, controls, links, our own UI. */
    const SKIP_SELECTOR = [
      'pre',
      'kbd',
      'samp',
      'textarea',
      'input',
      'select',
      'option',
      'button',
      'a',
      'script',
      'style',
      'svg',
      'math',
      '[contenteditable="true"]',
      '[data-lexical-editor]',
      CARD_SELECTOR,
      MENU_SELECTOR,
    ].join(',');

    /* ------------------------------------------------------------------ */
    /* Default glossary                                                    */
    /* ------------------------------------------------------------------ */

    const DEFAULTS = {
      API: '应用程序编程接口（Application Programming Interface）',
      SDK: '软件开发工具包（Software Development Kit）',
      CLI: '命令行界面（Command Line Interface）',
      GUI: '图形用户界面（Graphical User Interface）',
      UI: '用户界面（User Interface）',
      UX: '用户体验（User Experience）',
      URL: '统一资源定位符，也就是网址（Uniform Resource Locator）',
      URI: '统一资源标识符（Uniform Resource Identifier）',
      HTML: '超文本标记语言（HyperText Markup Language）',
      CSS: '层叠样式表（Cascading Style Sheets）',
      JS: 'JavaScript 的缩写',
      TS: 'TypeScript 的缩写',
      JSON: '一种轻量数据交换格式（JavaScript Object Notation）',
      YAML: '一种人类可读的配置/数据序列化格式',
      XML: '可扩展标记语言（eXtensible Markup Language）',
      HTTP: '超文本传输协议（HyperText Transfer Protocol）',
      HTTPS: '带 TLS 加密的 HTTP，浏览器地址栏的那把锁',
      TCP: '传输控制协议，可靠、有序的传输层协议',
      UDP: '用户数据报协议，不保证送达但快',
      IP: '网际协议，也常指 IP 地址',
      DNS: '域名系统，把域名解析成 IP（Domain Name System）',
      TLS: '传输层安全协议，HTTPS 的加密层',
      SSL: '安全套接层，TLS 的前身（现在一般说的其实是 TLS）',
      SSH: '安全外壳协议，用来远程登录服务器',
      FTP: '文件传输协议（File Transfer Protocol）',
      SMTP: '发邮件用的简单邮件传输协议',
      REST: '一种围绕资源与 HTTP 方法的接口风格（Representational State Transfer）',
      RPC: '远程过程调用（Remote Procedure Call）',
      gRPC: 'Google 的 RPC 框架，基于 HTTP/2 与 Protobuf',
      GraphQL: '由查询语句驱动的 API 语言，可精确取字段',
      SQL: '结构化查询语言，操作关系数据库（Structured Query Language）',
      DB: '数据库（Database）',
      ORM: '对象关系映射，把表映射成代码里的对象',
      CRUD: '增删改查（Create / Read / Update / Delete）',
      CI: '持续集成（Continuous Integration）',
      CD: '持续交付 / 持续部署（Continuous Delivery / Deployment）',
      VM: '虚拟机（Virtual Machine）',
      OS: '操作系统（Operating System）',
      CPU: '中央处理器',
      GPU: '图形处理器，AI 计算的主力',
      RAM: '内存，断电即丢（Random Access Memory）',
      ROM: '只读存储器',
      SSD: '固态硬盘',
      HDD: '机械硬盘',
      NAS: '网络附加存储，也就是网络硬盘',
      RAID: '多块磁盘组成阵列做冗余或提速',
      USB: '通用串行总线，就是那个 U 口',
      BIOS: '基本输入输出系统，开机最先跑的固件',
      UEFI: '统一可扩展固件接口，BIOS 的现代替代',
      LAN: '局域网',
      WAN: '广域网',
      VPN: '虚拟专用网络，把流量加密后走隧道',
      CDN: '内容分发网络，把静态资源放到离用户近的节点',
      CORS: '跨域资源共享，浏览器跨域请求的准入规则',
      CSRF: '跨站请求伪造攻击',
      XSS: '跨站脚本攻击',
      DDoS: '分布式拒绝服务攻击',
      JWT: '一种带签名的令牌格式（JSON Web Token）',
      OAuth: '一种授权协议，常见于「用某账号登录」',
      SAML: '企业单点登录常用的断言标记语言',
      SSO: '单点登录（Single Sign-On）',
      MFA: '多因素认证（Multi-Factor Authentication）',
      '2FA': '双因素认证（Two-Factor Authentication）',
      OTP: '一次性密码（One-Time Password）',
      CAPTCHA: '人机验证码',
      AI: '人工智能（Artificial Intelligence）',
      ML: '机器学习（Machine Learning）',
      DL: '深度学习（Deep Learning）',
      NLP: '自然语言处理（Natural Language Processing）',
      CV: '计算机视觉（Computer Vision），也常指简历',
      LLM: '大语言模型（Large Language Model）',
      RAG: '检索增强生成：先检索资料再让模型回答（Retrieval-Augmented Generation）',
      MoE: '专家混合架构，每个 token 只激活部分专家（Mixture of Experts）',
      GPT: '生成式预训练变换器（Generative Pre-trained Transformer）',
      OCR: '光学字符识别，图片文字变文本',
      ASR: '自动语音识别（Automatic Speech Recognition）',
      STT: '语音转文字（Speech To Text）',
      TTS: '文字转语音（Text To Speech）',
      PDF: '便携式文档格式',
      PPT: '演示文稿，也就是幻灯片（PowerPoint）',
      DOCX: 'Word 文档格式',
      XLSX: 'Excel 表格格式',
      CSV: '逗号分隔值，纯文本表格',
      TSV: '制表符分隔值，纯文本表格',
      PNG: '一种无损位图图片格式',
      JPEG: '一种有损压缩图片格式',
      GIF: '一种支持动图的图片格式',
      SVG: '可缩放矢量图形，放大不糊',
      MP3: '一种音频压缩格式',
      MP4: '一种视频容器格式',
      UUID: '通用唯一识别码，一串不会重复的 ID',
      GUID: '全局唯一标识符，和 UUID 基本同义',
      ASCII: '美国信息交换标准代码，最早的英文字符编码',
      'UTF-8': 'Unicode 的一种变长编码，现在最通用的文本编码',
      DOM: '文档对象模型，浏览器把 HTML 变成的那棵树',
      SSR: '服务端渲染（Server-Side Rendering）',
      SPA: '单页应用（Single Page Application）',
      PWA: '渐进式网页应用',
      ESM: 'ES 模块，JavaScript 标准的 import/export（ECMAScript Modules）',
      CJS: 'CommonJS 模块，Node 传统的 require/module.exports',
      AST: '抽象语法树，代码解析后的结构（Abstract Syntax Tree）',
      JIT: '即时编译，边跑边编译（Just-In-Time）',
      AOT: '提前编译（Ahead-Of-Time）',
      GC: '垃圾回收（Garbage Collection）',
      OOM: '内存耗尽（Out Of Memory）',
      DPI: '每英寸点数，鼠标灵敏度或打印精度',
      PPI: '每英寸像素数，屏幕精细度',
      HDR: '高动态范围，亮部暗部细节更多',
      IDE: '集成开发环境',
      VCS: '版本控制系统（Version Control System）',
      PR: '拉取请求，请求把你的分支合进主干（Pull Request）',
      WIP: '仍在进行中（Work In Progress）',
      TODO: '待办事项',
      FIXME: '待修复的地方',
      ASAP: '尽快（As Soon As Possible）',
      ETA: '预计完成时间（Estimated Time of Arrival）',
      FYI: '供你参考（For Your Information）',
      TBD: '待定（To Be Determined）',
      FAQ: '常见问题（Frequently Asked Questions）',
      'N/A': '不适用 / 无（Not Available）',
      'e.g.': '例如（拉丁语 exempli gratia）',
      'i.e.': '也就是说（拉丁语 id est）',
      'etc.': '等等（et cetera）',
      'vs.': '对比、对阵（versus）',
      MVP: '最小可行产品（Minimum Viable Product）',
      POC: '概念验证（Proof of Concept）',
      KPI: '关键绩效指标（Key Performance Indicator）',
      OKR: '目标与关键结果（Objectives and Key Results）',
      ROI: '投资回报率（Return on Investment）',
      SEO: '搜索引擎优化（Search Engine Optimization）',
      SLA: '服务等级协议（Service Level Agreement）',
      SaaS: '软件即服务（Software as a Service）',
      PaaS: '平台即服务（Platform as a Service）',
      IaaS: '基础设施即服务（Infrastructure as a Service）',
      B2B: '企业对企业（Business to Business）',
      B2C: '企业对消费者（Business to Consumer）',
      ERP: '企业资源计划（Enterprise Resource Planning）',
      CRM: '客户关系管理（Customer Relationship Management）',
      CMS: '内容管理系统（Content Management System）',
      DSH: 'DeepSeek Harness，也就是你现在用的这个桌面程序',
      MCP: '模型上下文协议，给模型外挂工具与数据的标准（Model Context Protocol）',
      IPC: '进程间通信（Inter-Process Communication）',
      TTL: '生存时间，数据多久过期（Time To Live）',
      QPS: '每秒查询数（Queries Per Second）',
      RPS: '每秒请求数（Requests Per Second）',
      TPS: '每秒事务数（Transactions Per Second）',
      CRON: '定时任务，名字来自 Unix 的 cron 守护进程',
      ID: '标识符（Identifier）',
    };

    /* ------------------------------------------------------------------ */
    /* State: defaults merged with the user's edits and deletions          */
    /* ------------------------------------------------------------------ */

    function readState() {
      let stored = null;
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch (err) {
        stored = null;
      }
      const glossary = Object.assign({}, DEFAULTS);
      if (stored && stored.glossary && typeof stored.glossary === 'object') {
        for (const key of Object.keys(stored.glossary)) {
          const value = stored.glossary[key];
          if (typeof value === 'string' && value.trim()) glossary[key] = value;
        }
      }
      const deleted = stored && Array.isArray(stored.deleted) ? stored.deleted.slice() : [];
      for (const key of deleted) delete glossary[key];
      const details = {};
      if (stored && stored.details && typeof stored.details === 'object') {
        for (const key of Object.keys(stored.details)) {
          const value = stored.details[key];
          if (typeof value === 'string' && value.trim()) details[key] = value;
        }
      }
      const auto = {};
      if (stored && stored.auto && typeof stored.auto === 'object') {
        for (const key of Object.keys(stored.auto)) {
          if (stored.auto[key] && glossary[key]) auto[key] = true;
        }
      }
      return {
        enabled: !(stored && stored.enabled === false),
        autoFill: !(stored && stored.autoFill === false),
        glossary,
        details,
        auto,
        deleted,
      };
    }

    function writeState(state) {
      try {
        window.localStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            v: 1,
            enabled: state.enabled,
            autoFill: state.autoFill,
            glossary: state.glossary,
            details: state.details,
            auto: state.auto,
            deleted: state.deleted,
          }),
        );
      } catch (err) {
        /* Storage can be unavailable; the session keeps working in memory. */
      }
    }

    const store = {
      state: readState(),
      listeners: new Set(),
      get() {
        return this.state;
      },
      subscribe(fn) {
        this.listeners.add(fn);
        return () => {
          this.listeners.delete(fn);
        };
      },
      set(next) {
        this.state = next;
        writeState(next);
        for (const fn of Array.from(this.listeners)) {
          try {
            fn();
          } catch (err) {
            /* one bad listener must not break the rest */
          }
        }
      },
      update(mutate) {
        this.set(mutate(this.state));
      },
      canonicalKey(key) {
        return resolveKey(this.state.glossary, key);
      },
      setEntry(key, value, fromAuto) {
        const text = String(value == null ? '' : value).trim();
        if (!text) return;
        this.update((state) => {
          const glossary = Object.assign({}, state.glossary);
          glossary[key] = text;
          const auto = Object.assign({}, state.auto);
          if (fromAuto) auto[key] = true;
          else delete auto[key];
          return {
            enabled: state.enabled,
            autoFill: state.autoFill,
            glossary,
            details: state.details,
            auto,
            deleted: state.deleted.filter((item) => item !== key),
          };
        });
      },
      removeEntry(key) {
        const keys = [key];
        const lower = key.toLowerCase();
        if (lower !== key) keys.push(lower);
        this.update((state) => {
          const glossary = Object.assign({}, state.glossary);
          const details = Object.assign({}, state.details);
          const auto = Object.assign({}, state.auto);
          for (const item of keys) {
            delete glossary[item];
            delete details[item];
            delete auto[item];
          }
          const deleted = state.deleted.slice();
          for (const item of keys) if (deleted.indexOf(item) === -1) deleted.push(item);
          return {
            enabled: state.enabled,
            autoFill: state.autoFill,
            glossary,
            details,
            auto,
            deleted,
          };
        });
      },
      getDetails(key) {
        return this.state.details[key] || '';
      },
      setDetails(key, value) {
        const text = String(value == null ? '' : value).trim();
        if (!text) return;
        this.update((state) => ({
          enabled: state.enabled,
          autoFill: state.autoFill,
          glossary: state.glossary,
          details: Object.assign({}, state.details, { [key]: text }),
          auto: state.auto,
          deleted: state.deleted,
        }));
      },
      clearDetails(key) {
        this.update((state) => {
          const details = Object.assign({}, state.details);
          delete details[key];
          return {
            enabled: state.enabled,
            autoFill: state.autoFill,
            glossary: state.glossary,
            details,
            auto: state.auto,
            deleted: state.deleted,
          };
        });
      },
      setEnabled(on) {
        this.update((state) => ({
          enabled: !!on,
          autoFill: state.autoFill,
          glossary: state.glossary,
          details: state.details,
          auto: state.auto,
          deleted: state.deleted,
        }));
      },
      setAutoFill(on) {
        this.update((state) => ({
          enabled: state.enabled,
          autoFill: !!on,
          glossary: state.glossary,
          details: state.details,
          auto: state.auto,
          deleted: state.deleted,
        }));
      },
      reset() {
        this.update((state) => ({
          enabled: true,
          autoFill: state.autoFill,
          glossary: Object.assign({}, DEFAULTS),
          details: {},
          auto: {},
          deleted: [],
        }));
      },
    };

    /* ------------------------------------------------------------------ */
    /* Matching                                                            */
    /* ------------------------------------------------------------------ */

    const ACRONYM_RE = /(?<![A-Za-z0-9_\-./])((?:[A-Z][A-Z0-9]{1,7})(?:-[A-Z0-9]{1,4})?)(?![A-Za-z0-9_])/g;
    const LATIN_RE = /(?<![A-Za-z])(e\.g\.|i\.e\.|etc\.|vs\.|cf\.)/gi;

    function escapeRegExp(text) {
      return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Glossary keys the generic scanner would not catch, in two tiers:
     * roman-word keys match on ASCII word boundaries (case-insensitively, so a
     * selected `MoE` also covers `moe`), and everything else — Chinese,
     * multi-word phrases — matches as a literal substring.
     */
    function buildExtraRegexes(glossary) {
      const wordLike = [];
      const literal = [];
      for (const key of Object.keys(glossary)) {
        if (typeof key !== 'string' || key.length < 2 || key.length > 60) continue;
        if (/^[A-Za-z][A-Za-z0-9_.]{1,30}$/.test(key)) wordLike.push(key);
        else literal.push(key);
      }
      const out = [];
      if (wordLike.length > 0) {
        wordLike.sort((a, b) => b.length - a.length);
        try {
          out.push(new RegExp('(?<![A-Za-z0-9_])(' + wordLike.map(escapeRegExp).join('|') + ')(?![A-Za-z0-9_])', 'gi'));
        } catch (err) {
          /* ignore an unusable key set */
        }
      }
      if (literal.length > 0) {
        literal.sort((a, b) => b.length - a.length);
        try {
          out.push(new RegExp('(' + literal.map(escapeRegExp).join('|') + ')', 'g'));
        } catch (err) {
          /* ignore an unusable key set */
        }
      }
      return out;
    }

    function lookupEntry(glossary, key) {
      return glossary[resolveKey(glossary, key)] || '';
    }

    /** The stored key a rendered token refers to, including case-insensitive hits. */
    function resolveKey(glossary, key) {
      if (Object.prototype.hasOwnProperty.call(glossary, key)) return key;
      const lower = key.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(glossary, lower)) return lower;
      for (const existing of Object.keys(glossary)) {
        if (existing.toLowerCase() === lower) return existing;
      }
      return key;
    }

    function findMatches(text, extras) {
      const raw = [];
      const regexes = [ACRONYM_RE, LATIN_RE].concat(extras || []);
      for (const regex of regexes) {
        if (!regex) continue;
        regex.lastIndex = 0;
        let match = regex.exec(text);
        while (match) {
          const value = match[1] || match[0];
          if (value && value.length >= 2) {
            raw.push({ start: match.index, end: match.index + value.length, key: value });
          }
          if (match[0].length === 0) regex.lastIndex += 1;
          match = regex.exec(text);
        }
      }
      raw.sort((a, b) => a.start - b.start || b.end - a.end);
      const out = [];
      let lastEnd = -1;
      for (const item of raw) {
        if (item.start >= lastEnd) {
          out.push(item);
          lastEnd = item.end;
        }
      }
      return out;
    }

    /* ------------------------------------------------------------------ */
    /* Decoration layer                                                    */
    /* ------------------------------------------------------------------ */

    let occurrences = [];
    let segmentMap = new WeakMap();
    let scanTimer = 0;
    let disposed = false;
    let started = false;

    function supportsHighlight() {
      return (
        typeof CSS !== 'undefined' &&
        CSS !== null &&
        !!CSS.highlights &&
        typeof Highlight === 'function'
      );
    }

    function setHighlight(name, ranges) {
      if (!supportsHighlight()) return;
      const highlight = new Highlight();
      for (const range of ranges) highlight.add(range);
      CSS.highlights.set(name, highlight);
    }

    function clearHighlights() {
      if (!supportsHighlight()) return;
      CSS.highlights.delete(HL_KNOWN);
      CSS.highlights.delete(HL_UNKNOWN);
    }

    function collectTextNodes() {
      const scope = document.querySelector(SCOPE_SELECTOR) || document.body;
      if (!scope) return [];
      let roots = scope.querySelectorAll(STEP_SELECTOR);
      if (roots.length === 0) roots = scope.querySelectorAll(FLOW_FALLBACK);
      const nodes = [];
      for (const root of roots) {
        if (root.closest(SKIP_SELECTOR)) continue;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
            const data = node.data;
            if (!data || data.length < 2 || !data.trim()) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        let node = walker.nextNode();
        while (node) {
          nodes.push(node);
          node = walker.nextNode();
        }
      }
      return nodes;
    }

    function rescan() {
      if (disposed) return;
      scanGeneration += 1;
      occurrences = [];
      segmentMap = new WeakMap();
      const state = store.get();
      if (!state.enabled) {
        clearHighlights();
        return;
      }
      const extras = buildExtraRegexes(state.glossary);
      const known = [];
      const unknown = [];
      for (const node of collectTextNodes()) {
        const matches = findMatches(node.data, extras);
        if (matches.length === 0) continue;
        const segments = [];
        for (const match of matches) {
          let range;
          try {
            range = document.createRange();
            range.setStart(node, match.start);
            range.setEnd(node, match.end);
          } catch (err) {
            continue;
          }
          const entry = lookupEntry(state.glossary, match.key);
          const occurrence = { node, start: match.start, end: match.end, key: match.key, range };
          segments.push(occurrence);
          occurrences.push(occurrence);
          if (entry) known.push(range);
          else unknown.push(range);
        }
        if (segments.length > 0) segmentMap.set(node, segments);
      }
      setHighlight(HL_KNOWN, known);
      setHighlight(HL_UNKNOWN, unknown);
      queueAutoFill();
    }

    function scheduleScan(delay) {
      if (disposed) return;
      if (scanTimer) return;
      scanTimer = window.setTimeout(() => {
        scanTimer = 0;
        rescan();
      }, delay);
    }

    /* ------------------------------------------------------------------ */
    /* Automatic pre-fill of unknown abbreviations                          */
    /* ------------------------------------------------------------------ */

    const autoState = {
      tried: new Set(),
      queue: [],
      queued: new Set(),
      inFlight: 0,
      attempted: 0,
      created: 0,
      failures: 0,
      stopped: false,
      lastError: '',
    };

    function stopAutoFill(reason) {
      autoState.stopped = true;
      autoState.lastError = reason;
      autoState.queue.length = 0;
      autoState.queued.clear();
    }

    function queueAutoFill() {
      if (disposed || !occurrences.length) return;
      const state = store.get();
      if (!state.enabled || !state.autoFill || autoState.stopped) return;
      if (autoState.attempted >= AUTO_BUDGET) return;
      const deleted = new Set(state.deleted.map((key) => key.toLowerCase()));
      let added = 0;
      for (const occurrence of occurrences) {
        if (autoState.attempted + autoState.queue.length >= AUTO_BUDGET) break;
        const key = occurrence.key;
        const lower = key.toLowerCase();
        if (NO_AUTO[lower]) continue;
        if (autoState.tried.has(lower) || autoState.queued.has(lower)) continue;
        if (lookupEntry(state.glossary, key)) continue;
        if (deleted.has(lower)) continue;
        autoState.queued.add(lower);
        autoState.queue.push({ key, context: messageTextFor(occurrence).slice(0, 1200) });
        added += 1;
      }
      if (added > 0) pumpAutoFill();
    }

    function pumpAutoFill() {
      while (
        !autoState.stopped &&
        autoState.inFlight < AUTO_CONCURRENCY &&
        autoState.queue.length > 0 &&
        autoState.attempted < AUTO_BUDGET
      ) {
        const batch = autoState.queue.splice(0, AUTO_BATCH);
        for (const item of batch) {
          const lower = item.key.toLowerCase();
          autoState.tried.add(lower);
          autoState.queued.delete(lower);
        }
        autoState.attempted += batch.length;
        autoState.inFlight += 1;
        sendAutoBatch(batch).finally(() => {
          autoState.inFlight -= 1;
          pumpAutoFill();
        });
      }
    }

    /** One batched model call; the host returns `entries` keyed by the requested spelling. */
    function sendAutoBatch(batch) {
      return window
        .fetch(FILL_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: batch.map((item) => ({ key: item.key, context: item.context })) }),
        })
        .then((response) => {
          if (response.status === 404 || response.status === 401 || response.status === 403) {
            stopAutoFill('接口不可用（HTTP ' + response.status + '）');
            return null;
          }
          return response
            .json()
            .then((data) => ({ data, status: response.status }))
            .catch(() => ({ data: null, status: response.status }));
        })
        .then((result) => {
          if (!result) return;
          const data = result.data;
          if (!data || !data.ok || !data.entries) {
            autoState.failures += 1;
            autoState.lastError = (data && data.error) || 'HTTP ' + result.status;
            if (autoState.failures >= 3) stopAutoFill(autoState.lastError);
            return;
          }
          autoState.failures = 0;
          autoState.lastError = '';
          let written = 0;
          for (const key of Object.keys(data.entries)) {
            const value = String(data.entries[key] || '').trim();
            if (!value) continue;
            if (lookupEntry(store.get().glossary, key)) continue;
            store.setEntry(key, value, true);
            written += 1;
          }
          autoState.created += written;
        })
        .catch((error) => {
          autoState.failures += 1;
          autoState.lastError = error && error.message ? error.message : String(error);
          if (autoState.failures >= 3) stopAutoFill(autoState.lastError);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Pointer hit testing                                                 */
    /* ------------------------------------------------------------------ */

    let lastPointer = { x: 0, y: 0 };

    function caretRangeAt(x, y) {
      try {
        if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
        if (document.caretPositionFromPoint) {
          const position = document.caretPositionFromPoint(x, y);
          if (!position) return null;
          const range = document.createRange();
          range.setStart(position.offsetNode, position.offset);
          range.collapse(true);
          return range;
        }
      } catch (err) {
        return null;
      }
      return null;
    }

    function occurrenceAt(x, y) {
      const range = caretRangeAt(x, y);
      if (!range) return null;
      const node = range.startContainer;
      if (!node || node.nodeType !== 3) return null;
      const segments = segmentMap.get(node);
      if (!segments) return null;
      const offset = range.startOffset;
      for (const segment of segments) {
        if (offset >= segment.start && offset < segment.end) return segment;
      }
      return null;
    }

    /* ------------------------------------------------------------------ */
    /* Hover card                                                          */
    /* ------------------------------------------------------------------ */

    let cardEl = null;
    let activeOcc = null;
    let pinned = false;
    let editing = false;
    let hideTimer = 0;
    let showTimer = 0;
    let asking = false;
    let askingKey = '';
    let askStatus = '';
    let askStatusKind = '';

    function ensureCard() {
      if (cardEl && cardEl.isConnected) return cardEl;
      if (!document.body) return null;
      const el = document.createElement('div');
      el.setAttribute(CARD_ATTR, '');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', '缩写解释');
      el.hidden = true;
      el.innerHTML = [
        '<div class="hdr">',
        '<span class="term"></span>',
        '<span class="badge"></span>',
        '<button class="x" type="button" aria-label="关闭" title="关闭">&#215;</button>',
        '</div>',
        '<div class="desc"></div>',
        '<div class="detail" hidden>',
        '<div class="dhead"><span>详细解释</span><button class="dclear" type="button" title="清掉这条详细解释">清除</button></div>',
        '<div class="dtext"></div>',
        '</div>',
        '<form class="editor" hidden>',
        '<textarea class="input" rows="2" placeholder="写下这个缩写是什么意思…"></textarea>',
        '<div class="erow">',
        '<button class="primary save" type="submit">保存</button>',
        '<button class="cancel" type="button">取消</button>',
        '<span class="msg"></span>',
        '</div>',
        '</form>',
        '<div class="askrow">',
        '<input class="q" type="text" placeholder="想更细？问一句，比如：它和 X 有什么区别" />',
        '<button class="askbtn" type="button">问</button>',
        '</div>',
        '<div class="qmsg"></div>',
        '<div class="arow">',
        '<button class="edit" type="button">编辑解释</button>',
        '<button class="del" type="button">删除</button>',
        '</div>',
        '<div class="tip">Enter 发送提问 · Esc 关闭 · 提问会带上这条回复的上下文</div>',
      ].join('');

      el.addEventListener('pointerenter', cancelHide);
      el.addEventListener('pointerleave', () => {
        if (!pinned && !editing) scheduleHide();
      });
      el.addEventListener('mousedown', (event) => event.stopPropagation());
      el.addEventListener('click', (event) => event.stopPropagation());
      // Typing in the card belongs to the card: the host's global shortcuts must
      // not see those keys, and the card pins itself once the user works in it.
      el.addEventListener('keydown', (event) => event.stopPropagation());
      el.addEventListener('keyup', (event) => event.stopPropagation());
      el.addEventListener(
        'pointerdown',
        () => {
          pinned = true;
          cancelHide();
        },
        true,
      );
      el.addEventListener('focusin', () => {
        pinned = true;
        cancelHide();
      });
      el.addEventListener('submit', (event) => {
        event.preventDefault();
        submitEdit();
      });
      el.querySelector('.x').addEventListener('click', (event) => {
        event.preventDefault();
        hideCard(true);
      });
      el.querySelector('.cancel').addEventListener('click', (event) => {
        event.preventDefault();
        editing = false;
        if (activeOcc) renderCard(el, activeOcc, false);
      });
      el.querySelector('.edit').addEventListener('click', (event) => {
        event.preventDefault();
        beginEdit();
      });
      el.querySelector('.del').addEventListener('click', (event) => {
        event.preventDefault();
        removeCurrent();
      });
      el.querySelector('.input').addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          editing = false;
          if (activeOcc) renderCard(el, activeOcc, false);
          return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          submitEdit();
        }
      });

      el.querySelector('.askbtn').addEventListener('click', (event) => {
        event.preventDefault();
        askCurrent();
      });
      el.querySelector('.q').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          askCurrent();
          return;
        }
        if (event.key === 'Escape') {
          event.stopPropagation();
          event.currentTarget.blur();
        }
      });
      el.querySelector('.dclear').addEventListener('click', (event) => {
        event.preventDefault();
        if (!activeOcc) return;
        store.clearDetails(currentKey());
        askStatus = '';
        renderCard(el, activeOcc, false);
        positionCard(el, activeOcc.range);
      });

      document.body.appendChild(el);
      cardEl = el;
      return el;
    }

    function renderCard(el, occurrence, isEditing) {
      if (!el || !occurrence) return;
      const state = store.get();
      const entry = lookupEntry(state.glossary, occurrence.key);
      const key = store.canonicalKey(occurrence.key);
      const details = state.details[key] || '';
      el.querySelector('.term').textContent = occurrence.key;
      const badge = el.querySelector('.badge');
      badge.textContent = entry ? '已收录' : '未收录';
      if (entry) badge.setAttribute('data-known', '1');
      else badge.removeAttribute('data-known');
      const desc = el.querySelector('.desc');
      desc.textContent = entry || '这个词条还没有解释，点「添加解释」写一条。';
      if (entry) desc.removeAttribute('data-empty');
      else desc.setAttribute('data-empty', '1');

      const detailBox = el.querySelector('.detail');
      const detailText = el.querySelector('.dtext');
      detailText.textContent = details;
      detailBox.hidden = !!isEditing || !details;

      el.querySelector('.editor').hidden = !isEditing;
      el.querySelector('.arow').hidden = !!isEditing;
      el.querySelector('.tip').hidden = !!isEditing;
      el.querySelector('.askrow').hidden = !!isEditing;
      el.querySelector('.qmsg').hidden = !!isEditing;
      el.querySelector('.del').hidden = !entry;
      el.querySelector('.edit').textContent = entry ? '编辑解释' : '添加解释';
      el.querySelector('.msg').textContent = '';

      const input = el.querySelector('.q');
      input.disabled = asking;
      const askButton = el.querySelector('.askbtn');
      askButton.disabled = asking;
      askButton.textContent = asking ? '问…' : '问';
      const qmsg = el.querySelector('.qmsg');
      qmsg.textContent = askStatus;
      qmsg.setAttribute('data-kind', askStatusKind);

      if (isEditing) {
        const editor = el.querySelector('.input');
        editor.value = entry || '';
        window.setTimeout(() => {
          try {
            editor.focus();
            editor.select();
          } catch (err) {
            /* ignore */
          }
        }, 0);
      }
    }

    function positionCard(el, range) {
      if (!el) return;
      let rect = null;
      try {
        rect = range.getBoundingClientRect();
      } catch (err) {
        rect = null;
      }
      if (!rect || (!rect.width && !rect.height)) {
        rect = { left: lastPointer.x, top: lastPointer.y, bottom: lastPointer.y, width: 0, height: 0 };
      }
      const gap = 8;
      const margin = 8;
      const width = el.offsetWidth || 320;
      const height = el.offsetHeight || 120;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      let top = rect.bottom + gap;
      if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - gap);
      el.style.left = Math.round(left) + 'px';
      el.style.top = Math.round(top) + 'px';
    }

    function showCard(occurrence, options) {
      const el = ensureCard();
      if (!el) return;
      const opts = options || {};
      const changed = activeOcc !== occurrence;
      if (changed) {
        activeOcc = occurrence;
        editing = false;
        pinned = false;
        if (askingKey && askingKey !== store.canonicalKey(occurrence.key)) {
          asking = false;
          askingKey = '';
        }
        askStatus = '';
        askStatusKind = '';
        const question = el.querySelector('.q');
        if (question) question.value = '';
      }
      if (opts.pinned) pinned = true;
      if (opts.edit) {
        editing = true;
        pinned = true;
      }
      renderCard(el, occurrence, editing);
      el.hidden = false;
      positionCard(el, occurrence.range);
      if (document.body) document.body.setAttribute('data-dsh-abbr-hovering', '');
    }

    function hideCard(force) {
      if (!force && (editing || pinned)) return;
      if (cardEl && !cardEl.hidden) cardEl.hidden = true;
      activeOcc = null;
      pinned = false;
      editing = false;
      if (document.body) document.body.removeAttribute('data-dsh-abbr-hovering');
    }

    /** Is the user's caret inside the card right now? */
    function cardHasFocus() {
      return !!(cardEl && document.activeElement && cardEl.contains(document.activeElement));
    }

    function scheduleHide() {
      if (cardHasFocus()) return;
      if (hideTimer) return;
      hideTimer = window.setTimeout(() => {
        hideTimer = 0;
        if (!pinned && !editing && !cardHasFocus()) hideCard(true);
      }, 220);
    }

    function cancelHide() {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = 0;
      }
    }

    function beginEdit() {
      if (!cardEl || !activeOcc) return;
      editing = true;
      pinned = true;
      renderCard(cardEl, activeOcc, true);
    }

    function currentKey() {
      if (!activeOcc) return '';
      return store.canonicalKey(activeOcc.key);
    }

    function submitEdit() {
      if (!cardEl || !activeOcc) return;
      const input = cardEl.querySelector('.input');
      const value = String(input.value || '').trim();
      if (!value) {
        cardEl.querySelector('.msg').textContent = '解释不能为空，要删掉请点「删除」';
        return;
      }
      store.setEntry(currentKey(), value);
      editing = false;
      renderCard(cardEl, activeOcc, false);
      positionCard(cardEl, activeOcc.range);
    }

    function removeCurrent() {
      if (!cardEl || !activeOcc) return;
      const key = currentKey();
      store.removeEntry(key);
      editing = false;
      askStatus = '';
      renderCard(cardEl, activeOcc, false);
      positionCard(cardEl, activeOcc.range);
    }

    /** The reply a DOM node sits in, trimmed to a prompt-sized context. */
    const contextCache = new WeakMap();
    let scanGeneration = 0;

    function stepElementFor(node) {
      const element = node && (node.nodeType === 1 ? node : node.parentElement);
      if (!element || !element.closest) return null;
      return element.closest(STEP_SELECTOR) || element.closest('[data-chat-flow]');
    }

    function contextForNode(node) {
      try {
        const step = stepElementFor(node);
        if (!step) return '';
        const cached = contextCache.get(step);
        if (cached && cached.generation === scanGeneration) return cached.text;
        const text = String(step.innerText || '').trim().slice(0, 4000);
        contextCache.set(step, { generation: scanGeneration, text });
        return text;
      } catch (err) {
        return '';
      }
    }

    function messageTextFor(occurrence) {
      return contextForNode(occurrence && occurrence.node);
    }

    function askErrorMessage(data, status) {
      if (data && data.ok === false && data.error) return '没能问到：' + data.error;
      if (status === 404) return '没找到追问接口：宿主半边还没加载，重启一次应用就好';
      if (status === 401 || status === 403) return '这个页面没有权限调用追问接口';
      if (status) return '没能问到（HTTP ' + status + '）';
      return '没能问到，稍后再试';
    }

    /** Ask the host half for a longer explanation, in the context of this reply. */
    function askCurrent() {
      if (!cardEl || !activeOcc || asking) return;
      const occurrence = activeOcc;
      const key = currentKey();
      const questionInput = cardEl.querySelector('.q');
      const rawQuestion = String(questionInput.value || '').trim();
      asking = true;
      askingKey = key;
      askStatus = '正在问…';
      askStatusKind = 'pending';
      renderCard(cardEl, occurrence, false);
      positionCard(cardEl, occurrence.range);

      const settle = (status, kind) => {
        asking = false;
        askingKey = '';
        askStatus = status;
        askStatusKind = kind;
        if (cardEl && activeOcc && store.canonicalKey(activeOcc.key) === key) {
          renderCard(cardEl, activeOcc, false);
          positionCard(cardEl, activeOcc.range);
        }
      };

      window
        .fetch(EXPLAIN_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            key: occurrence.key,
            question: rawQuestion,
            explanation: lookupEntry(store.get().glossary, occurrence.key),
            context: messageTextFor(occurrence),
          }),
        })
        .then((response) =>
          response
            .json()
            .then((data) => ({ data, status: response.status }))
            .catch(() => ({ data: null, status: response.status })),
        )
        .then((result) => {
          const data = result.data;
          if (!data || !data.ok) {
            settle(askErrorMessage(data, result.status), 'error');
            return;
          }
          store.setDetails(key, data.text);
          if (questionInput) questionInput.value = '';
          settle('已更新详细解释' + (data.model ? '（' + data.model + '）' : ''), 'ok');
        })
        .catch((error) => {
          settle('请求失败：' + (error && error.message ? error.message : String(error)), 'error');
        });
    }

    /* ------------------------------------------------------------------ */
    /* Selection menu: turn any selection into a hover entry                */
    /* ------------------------------------------------------------------ */

    let menuEl = null;
    let menuTerm = '';
    let menuNode = null;
    let menuBusy = false;
    let menuKind = '';
    let menuConfirm = false;
    let menuToken = 0;
    let menuHideTimer = 0;
    let menuAnchor = { x: 0, y: 0 };
    let menuOpenedAt = 0;

    /** Cancel the pending "the pointer left the menu" dismissal. */
    function cancelMenuHide() {
      if (menuHideTimer) {
        window.clearTimeout(menuHideTimer);
        menuHideTimer = 0;
      }
    }

    /** Dismiss the menu a moment after the pointer leaves it, unless it comes back. */
    function scheduleMenuHide(delay) {
      if (menuHideTimer) return;
      menuHideTimer = window.setTimeout(() => {
        menuHideTimer = 0;
        hideMenu();
      }, delay === undefined ? 160 : delay);
    }

    /** Is this viewport point inside the menu (with a small forgiveness margin)? */
    function pointInMenu(x, y) {
      if (!menuEl || menuEl.hidden) return false;
      const rect = menuEl.getBoundingClientRect();
      const pad = 4;
      return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
    }

    /** Trim the selection down to a storable term: no edge punctuation, one-line. */
    function normalizeTerm(value) {
      return String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/^[\s"'“”‘’()（）\[\]【】「」『』<>《》]+/, '')
        .replace(/[\s"'“”‘’()（）\[\]【】「」『』<>《》，。；：、!?！？,.;:]+$/, '')
        .trim();
    }

    function isInsideMenu(node) {
      const element = node && (node.nodeType === 1 ? node : node.parentElement);
      return !!(element && element.closest && element.closest(MENU_SELECTOR));
    }

    function ensureMenu() {
      if (menuEl && menuEl.isConnected) return menuEl;
      if (!document.body) return null;
      const el = document.createElement('div');
      el.setAttribute(MENU_ATTR, '');
      el.setAttribute('role', 'menu');
      el.hidden = true;
      el.innerHTML = [
        '<div class="mhdr"><span class="mtxt"></span><button class="mx" type="button" aria-label="关闭" title="关闭">&#215;</button></div>',
        '<button class="mgen" type="button" role="menuitem">生成悬停解释</button>',
        '<button class="mcopy" type="button" role="menuitem">复制选中文本</button>',
        '<div class="mmsg"></div>',
      ].join('');
      el.addEventListener('pointerdown', (event) => event.stopPropagation());
      el.addEventListener('click', (event) => event.stopPropagation());
      el.addEventListener('contextmenu', (event) => event.preventDefault());
      el.addEventListener('pointerenter', () => cancelMenuHide());
      el.addEventListener('pointerleave', () => scheduleMenuHide(160));
      el.querySelector('.mx').addEventListener('click', (event) => {
        event.preventDefault();
        hideMenu();
      });
      el.querySelector('.mgen').addEventListener('click', (event) => {
        event.preventDefault();
        generateFromMenu();
      });
      el.querySelector('.mcopy').addEventListener('click', (event) => {
        event.preventDefault();
        copyFromMenu();
      });
      document.body.appendChild(el);
      menuEl = el;
      return el;
    }

    function positionMenu(el, x, y) {
      const width = el.offsetWidth || 240;
      const height = el.offsetHeight || 120;
      const margin = 8;
      const left = Math.max(margin, Math.min(x, window.innerWidth - width - margin));
      let top = y + 6;
      if (top + height > window.innerHeight - margin) top = Math.max(margin, y - height - 6);
      el.style.left = Math.round(left) + 'px';
      el.style.top = Math.round(top) + 'px';
    }

    function setMenuMessage(text, kind) {
      if (!menuEl) return;
      const message = menuEl.querySelector('.mmsg');
      message.textContent = text;
      if (kind) message.setAttribute('data-kind', kind);
      else message.removeAttribute('data-kind');
      menuKind = kind || '';
    }

    function showMenu(x, y, term, node) {
      const el = ensureMenu();
      if (!el) return;
      cancelMenuHide();
      menuToken += 1;
      hideCard(true);
      menuTerm = term;
      menuNode = node;
      menuBusy = false;
      menuKind = '';
      menuAnchor = { x, y };
      menuOpenedAt = performance.now();
      el.querySelector('.mtxt').textContent = term;
      const existing = lookupEntry(store.get().glossary, term);
      menuConfirm = !!existing;
      const generate = el.querySelector('.mgen');
      generate.disabled = false;
      generate.textContent = existing ? '重新生成解释' : '生成悬停解释';
      setMenuMessage(existing ? '这个词已经有解释，重新生成会覆盖它' : '', '');
      el.hidden = false;
      positionMenu(el, x, y);
    }

    function hideMenu() {
      cancelMenuHide();
      menuToken += 1;
      if (menuEl && !menuEl.hidden) menuEl.hidden = true;
      menuTerm = '';
      menuNode = null;
      menuBusy = false;
      menuKind = '';
      menuConfirm = false;
    }

    function copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
          return true;
        }
      } catch (err) {
        /* fall through to the textarea path */
      }
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        return true;
      } catch (err) {
        return false;
      }
    }

    function copyFromMenu() {
      if (!menuTerm) return;
      copyText(menuTerm);
      const token = menuToken;
      setMenuMessage('已复制', 'ok');
      window.setTimeout(() => {
        if (token === menuToken) hideMenu();
      }, 700);
    }

    /** Ask the host half for a one-line definition of the selection, then store it. */
    function generateFromMenu() {
      if (!menuEl || !menuTerm || menuBusy) return;
      const el = menuEl;
      const term = menuTerm;
      const generate = el.querySelector('.mgen');
      if (menuConfirm) {
        menuConfirm = false;
        generate.textContent = '确认覆盖？';
        return;
      }

      const token = menuToken;
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      menuBusy = true;
      generate.disabled = true;
      generate.textContent = '正在生成…';
      setMenuMessage('正在问模型，最多 45 秒…', '');
      const context = contextForNode(menuNode).slice(0, 1500);

      const hardStop = window.setTimeout(() => {
        if (!controller) return;
        try {
          controller.abort();
        } catch (err) {
          /* ignore */
        }
      }, 45_000);

      /** The menu still shows this exact term, so its UI may be updated. */
      const stillMine = () => token === menuToken && menuTerm === term && menuEl && !menuEl.hidden;

      const finish = (apply) => {
        window.clearTimeout(hardStop);
        generate.disabled = false;
        if (token === menuToken) menuBusy = false;
        if (!stillMine()) return;
        try {
          apply();
        } catch (err) {
          setMenuMessage('没能生成：' + (err && err.message ? err.message : String(err)), 'error');
        }
      };

      window
        .fetch(EXPLAIN_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'term', key: term, question: '', explanation: '', context }),
          signal: controller ? controller.signal : undefined,
        })
        .then((response) =>
          response
            .json()
            .then((data) => ({ data, status: response.status }))
            .catch(() => ({ data: null, status: response.status })),
        )
        .then((result) => {
          const data = result.data;
          const ok = !!(data && data.ok && data.text);
          // Store the definition even when the menu already went away: the user
          // asked for the entry, not for the menu.
          if (ok) store.setEntry(term, data.text, true);
          finish(() => {
            if (!ok) {
              let reason = (data && data.error) || 'HTTP ' + result.status;
              if (result.status === 404) reason = '接口没加载（宿主半边要重启应用）';
              generate.textContent = '重试';
              setMenuMessage('没能生成：' + reason, 'error');
              return;
            }
            generate.textContent = '再来一条';
            setMenuMessage('已收录：' + data.text, 'ok');
          });
        })
        .catch((error) => {
          finish(() => {
            const aborted = controller !== null && controller.signal.aborted;
            generate.textContent = '重试';
            setMenuMessage(
              aborted
                ? '生成超时了（45 秒），可以重试'
                : '没能生成：' + (error && error.message ? error.message : String(error)),
              'error',
            );
          });
        });
    }

    function onContextMenu(event) {
      if (!store.get().enabled) return;
      const selection = window.getSelection ? window.getSelection() : null;
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const term = normalizeTerm(String(selection));
      if (!term || term.length > 40) return;
      if (!/[A-Za-z\u4e00-\u9fff]/.test(term)) return;
      const range = selection.getRangeAt(0);
      const step = stepElementFor(range.commonAncestorContainer);
      if (!step) return;
      event.preventDefault();
      event.stopPropagation();
      showMenu(event.clientX, event.clientY, term, range.commonAncestorContainer);
    }

    /** Any press outside the menu closes it, even when the press never becomes a click. */
    function onPointerDownOutside(event) {
      if (!menuEl || menuEl.hidden) return;
      if (isInsideMenu(event.target)) return;
      hideMenu();
    }

    /* ------------------------------------------------------------------ */
    /* DOM event wiring                                                    */
    /* ------------------------------------------------------------------ */

    function isInsideCard(node) {
      if (!node) return false;
      const element = node.nodeType === 1 ? node : node.parentElement;
      return !!(element && element.closest && element.closest(CARD_SELECTOR));
    }

    function onPointerMove(event) {
      if (event.pointerType === 'touch') return;
      lastPointer = { x: event.clientX, y: event.clientY };

      // The selection menu leaves when the pointer moves away from it; there is no timer.
      if (menuEl && !menuEl.hidden) {
        if (isInsideMenu(event.target) || pointInMenu(event.clientX, event.clientY)) {
          cancelMenuHide();
        } else if (performance.now() - menuOpenedAt > 400) {
          const dx = event.clientX - menuAnchor.x;
          const dy = event.clientY - menuAnchor.y;
          if (dx * dx + dy * dy > 2500) scheduleMenuHide(160);
        }
      }

      if (isInsideCard(event.target)) {
        cancelHide();
        return;
      }
      if (!store.get().enabled) return;
      if (pinned || editing) return;
      const element = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
      if (!element || !element.closest || !element.closest(SCOPE_SELECTOR)) {
        scheduleHide();
        return;
      }
      const occurrence = occurrenceAt(event.clientX, event.clientY);
      if (!occurrence) {
        scheduleHide();
        return;
      }
      cancelHide();
      if (activeOcc === occurrence) return;
      if (showTimer) window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => {
        showTimer = 0;
        if (!pinned && !editing) showCard(occurrence, {});
      }, 70);
    }

    function onClick(event) {
      if (isInsideMenu(event.target)) return;
      if (menuEl && !menuEl.hidden) hideMenu();
      if (!store.get().enabled) return;
      if (isInsideCard(event.target)) return;
      const selection = window.getSelection ? String(window.getSelection()).trim() : '';
      if (selection) return;
      const occurrence = occurrenceAt(event.clientX, event.clientY);
      if (occurrence) {
        cancelHide();
        showCard(occurrence, { pinned: true, edit: true });
        return;
      }
      if (cardEl && !cardEl.hidden && pinned) hideCard(true);
    }

    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      if (menuEl && !menuEl.hidden) {
        hideMenu();
        return;
      }
      if (cardEl && !cardEl.hidden) hideCard(true);
    }

    function onMutations(records) {
      for (const record of records) {
        const target = record.target;
        const element = target && target.nodeType === 1 ? target : target && target.parentElement;
        if (element && element.closest && element.closest(CARD_SELECTOR)) continue;
        if (record.type === 'childList' && cardEl) {
          const nodes = Array.prototype.slice.call(record.addedNodes).concat(Array.prototype.slice.call(record.removedNodes));
          if (nodes.length > 0 && nodes.every((node) => node === cardEl)) continue;
        }
        scheduleScan(320);
        return;
      }
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS_TEXT = [
      '::highlight(' + HL_KNOWN + '){text-decoration:underline dotted;text-decoration-thickness:1px}',
      '::highlight(' + HL_UNKNOWN + '){text-decoration:underline dotted;text-decoration-thickness:1px;color:var(--dsw-alias-label-secondary,inherit)}',
      'body[data-dsh-abbr-hovering] ' + SCOPE_SELECTOR + '{cursor:help}',
      '[data-dsh-abbr-card]{position:fixed;z-index:2147483000;box-sizing:border-box;width:min(340px,calc(100vw - 24px));padding:10px 12px 11px;border-radius:12px;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.32));background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#111);box-shadow:var(--dsw-shadow-lv3,0 10px 30px rgba(0,0,0,.16));font-family:inherit;font-size:13px;line-height:18px}',
      '[data-dsh-abbr-card][hidden]{display:none}',
      '[data-dsh-abbr-card] [hidden]{display:none!important}',
      '[data-dsh-abbr-card] .hdr{display:flex;align-items:center;gap:8px}',
      '[data-dsh-abbr-card] .term{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;font-weight:600;letter-spacing:.01em;color:var(--dsw-alias-label-primary,#111)}',
      '[data-dsh-abbr-card] .badge{padding:0 6px;border-radius:999px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#888);background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.12))}',
      '[data-dsh-abbr-card] .badge[data-known="1"]{color:var(--dsw-alias-state-success-primary,#0a8f5b);background:transparent}',
      '[data-dsh-abbr-card] .x{margin-left:auto;padding:0 4px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#888);font-size:16px;line-height:18px;cursor:pointer}',
      '[data-dsh-abbr-card] .desc{margin-top:7px;color:var(--dsw-alias-label-primary,#111);white-space:pre-wrap;word-break:break-word}',
      '[data-dsh-abbr-card] .desc[data-empty="1"]{color:var(--dsw-alias-label-tertiary,#888)}',
      '[data-dsh-abbr-card] .detail{margin-top:8px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.22))}',
      '[data-dsh-abbr-card] .dhead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#999)}',
      '[data-dsh-abbr-card] .dclear{padding:0 2px;border:none;background:transparent;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#999)}',
      '[data-dsh-abbr-card] .dtext{margin-top:4px;max-height:190px;overflow:auto;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary,#444);font-size:12.5px;line-height:19px}',
      '[data-dsh-abbr-card] .askrow{display:flex;gap:6px;margin-top:10px}',
      '[data-dsh-abbr-card] .q{flex:1;min-width:0;box-sizing:border-box;padding:5px 8px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.32));background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;font:inherit;font-size:12px;outline:none}',
      '[data-dsh-abbr-card] .q:focus{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '[data-dsh-abbr-card] .q:disabled{opacity:.55}',
      '[data-dsh-abbr-card] .qmsg{margin-top:6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#999)}',
      '[data-dsh-abbr-card] .qmsg[data-kind="error"]{color:var(--dsw-alias-state-error-primary,#c0392b)}',
      '[data-dsh-abbr-card] .qmsg[data-kind="ok"]{color:var(--dsw-alias-state-success-primary,#0a8f5b)}',
      '[data-dsh-abbr-card] .arow,[data-dsh-abbr-card] .erow{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}',
      '[data-dsh-abbr-card] button{font:inherit;font-size:12px;line-height:16px;padding:4px 10px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:transparent;color:var(--dsw-alias-label-secondary,#555);cursor:pointer}',
      '[data-dsh-abbr-card] button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14));color:var(--dsw-alias-label-primary,#111)}',
      '[data-dsh-abbr-card] button.primary{background:var(--dsw-alias-button-primary-fill,#1f1f1f);border-color:transparent;color:var(--dsw-alias-label-primary-inverted,#fff)}',
      '[data-dsh-abbr-card] .input{width:100%;box-sizing:border-box;min-height:58px;resize:vertical;padding:8px 10px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;font:inherit;outline:none}',
      '[data-dsh-abbr-card] .input:focus{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '[data-dsh-abbr-card] .msg{color:var(--dsw-alias-state-error-primary,#c0392b);font-size:11px;line-height:16px}',
      '[data-dsh-abbr-card] .tip{margin-top:8px;color:var(--dsw-alias-label-tertiary,#999);font-size:11px;line-height:16px}',

      '[data-dsh-abbr-menu]{position:fixed;z-index:2147483001;box-sizing:border-box;min-width:220px;max-width:320px;padding:6px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.32));background:var(--dsw-alias-bg-overlay,#fff);color:var(--dsw-alias-label-primary,#111);box-shadow:var(--dsw-shadow-lv3,0 10px 30px rgba(0,0,0,.16));font-family:inherit;font-size:12.5px;line-height:18px}',
      '[data-dsh-abbr-menu][hidden]{display:none}',
      '[data-dsh-abbr-menu] .mhdr{display:flex;align-items:center;gap:6px;padding:2px 4px 4px 8px;color:var(--dsw-alias-label-tertiary,#999);font-size:11px;line-height:16px}',
      '[data-dsh-abbr-menu] .mtxt{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#555);font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace)}',
      '[data-dsh-abbr-menu] .mx{flex:none;width:auto;margin:0;padding:0 4px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#999);font-size:14px;line-height:16px;text-align:center;cursor:pointer}',
      '[data-dsh-abbr-menu] .mx:hover:not(:disabled){color:var(--dsw-alias-label-primary,#111);background:transparent}',
      '[data-dsh-abbr-menu] button{display:block;width:100%;box-sizing:border-box;padding:6px 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#111);font:inherit;font-size:12.5px;line-height:18px;text-align:left;cursor:pointer}',
      '[data-dsh-abbr-menu] button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}',
      '[data-dsh-abbr-menu] button:disabled{color:var(--dsw-alias-label-tertiary,#999);cursor:default}',
      '[data-dsh-abbr-menu] .mmsg{padding:4px 8px 2px;color:var(--dsw-alias-label-tertiary,#999);font-size:11px;line-height:16px;white-space:pre-wrap;word-break:break-word}',
      '[data-dsh-abbr-menu] .mmsg[data-kind="ok"]{color:var(--dsw-alias-state-success-primary,#0a8f5b)}',
      '[data-dsh-abbr-menu] .mmsg[data-kind="error"]{color:var(--dsw-alias-state-error-primary,#c0392b)}',
      '[data-dsh-abbr-menu] .mmsg:empty{display:none}',

      '.dsh-abbr-hint-settings{display:flex;flex-direction:column;gap:14px;max-width:760px;padding:2px 0 24px;color:var(--dsw-alias-label-primary,#111);font-size:14px;line-height:22px}',
      '.dsh-abbr-hint-settings .lede{margin:0;color:var(--dsw-alias-label-secondary,#666);font-size:13px;line-height:20px}',
      '.dsh-abbr-hint-settings .lede[data-kind="ok"]{color:var(--dsw-alias-state-success-primary,#0a8f5b)}',
      '.dsh-abbr-hint-settings .lede[data-kind="bad"]{color:var(--dsw-alias-state-warn-primary,#b26a00)}',
      '.dsh-abbr-hint-settings .toggle{display:flex;align-items:center;gap:8px;font-size:13px}',
      '.dsh-abbr-hint-settings .toggle input{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.dsh-abbr-hint-settings .add{display:flex;gap:8px;flex-wrap:wrap}',
      '.dsh-abbr-hint-settings input[type="text"]{box-sizing:border-box;padding:6px 10px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;font:inherit;font-size:13px;outline:none;min-width:0}',
      '.dsh-abbr-hint-settings input[type="text"]:focus{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}',
      '.dsh-abbr-hint-settings .add input.key{width:150px;font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace)}',
      '.dsh-abbr-hint-settings .add input.val{flex:1;min-width:200px}',
      '.dsh-abbr-hint-settings button{font:inherit;font-size:13px;padding:6px 12px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:transparent;color:var(--dsw-alias-label-secondary,#555);cursor:pointer}',
      '.dsh-abbr-hint-settings button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14));color:var(--dsw-alias-label-primary,#111)}',
      '.dsh-abbr-hint-settings button.primary{background:var(--dsw-alias-button-primary-fill,#1f1f1f);border-color:transparent;color:var(--dsw-alias-label-primary-inverted,#fff)}',
      '.dsh-abbr-hint-settings .search{width:100%}',
      '.dsh-abbr-hint-settings .list{display:flex;flex-direction:column;max-height:min(52vh,440px);overflow:auto;border:.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.22));border-radius:10px}',
      '.dsh-abbr-hint-settings .row{display:grid;grid-template-columns:minmax(76px,124px) 1fr auto;gap:10px;align-items:center;padding:7px 10px;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.16))}',
      '.dsh-abbr-hint-settings .row:last-child{border-bottom:none}',
      '.dsh-abbr-hint-settings .row code{font-family:var(--ds-font-family-code,ui-monospace,Menlo,monospace);font-size:12px;color:var(--dsw-alias-label-secondary,#555);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-abbr-hint-settings .keycell{display:flex;align-items:center;gap:6px;min-width:0}',
      '.dsh-abbr-hint-settings .dtag{flex:none;padding:0 4px;border-radius:4px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary,#999);background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.12))}',
      '.dsh-abbr-hint-settings .acts{display:flex;gap:4px;justify-content:flex-end}',
      '.dsh-abbr-hint-settings .row input{width:100%;background:transparent;border-color:transparent}',
      '.dsh-abbr-hint-settings .row input:hover{border-color:var(--dsw-alias-border-l2,rgba(128,128,128,.35))}',
      '.dsh-abbr-hint-settings .row button{padding:2px 6px;border-color:transparent;font-size:12px;color:var(--dsw-alias-label-tertiary,#999)}',
      '.dsh-abbr-hint-settings .foot{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.dsh-abbr-hint-settings .status{color:var(--dsw-alias-label-tertiary,#999);font-size:12px}',
      '.dsh-abbr-hint-settings .empty{padding:16px;color:var(--dsw-alias-label-tertiary,#999);font-size:13px;text-align:center}',
    ].join('\n');

    function injectStyles() {
      if (!document.head) return;
      if (document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG_ID) + ']')) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-abbr-hint';
      tag.dataset.pluginCss = CSS_TAG_ID;
      tag.textContent = CSS_TEXT;
      document.head.appendChild(tag);
    }

    /* ------------------------------------------------------------------ */
    /* Settings section                                                    */
    /* ------------------------------------------------------------------ */

    function AbbrSettings() {
      const [, bump] = React.useState(0);
      React.useEffect(() => store.subscribe(() => bump((n) => n + 1)), []);
      const state = store.get();
      const autoFillStatus = () =>
        autoState.stopped
          ? '自动补全：已暂停 —— ' + (autoState.lastError || '接口不可用')
          : '自动补全：这一页已生成 ' + autoState.created + ' 条（本次尝试 ' + autoState.attempted + ' / 上限 ' + AUTO_BUDGET + '）';
      const [query, setQuery] = React.useState('');
      const [newKey, setNewKey] = React.useState('');
      const [newValue, setNewValue] = React.useState('');
      const [status, setStatus] = React.useState('');
      const [confirmReset, setConfirmReset] = React.useState(false);
      const [probe, setProbe] = React.useState({ state: 'checking', text: '追问接口：检查中…' });

      React.useEffect(() => {
        let alive = true;
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = window.setTimeout(() => {
          if (controller) controller.abort();
        }, 8000);
        window
          .fetch(PING_URL, { signal: controller ? controller.signal : undefined })
          .then((response) =>
            response
              .json()
              .then((data) => ({ ok: response.ok, data }))
              .catch(() => ({ ok: false, data: null })),
          )
          .then((result) => {
            if (!alive) return;
            if (result.data && result.data.ok) {
              const route = result.data.route;
              setProbe({
                state: 'ok',
                text:
                  '追问接口：可用' + (route ? '（' + route.provider + ' / ' + route.model + '）' : '（但没有可用的模型路由）'),
              });
            } else {
              setProbe({ state: 'bad', text: '追问接口：不可用，宿主半边还没加载 —— 重启一次应用就好' });
            }
          })
          .catch(() => {
            if (alive) setProbe({ state: 'bad', text: '追问接口：连不上，宿主半边还没加载 —— 重启一次应用就好' });
          })
          .finally(() => window.clearTimeout(timer));
        return () => {
          alive = false;
          window.clearTimeout(timer);
          if (controller) controller.abort();
        };
      }, []);

      const keys = Object.keys(state.glossary).sort((a, b) => a.localeCompare(b));
      const needle = query.trim().toLowerCase();
      const shown = needle
        ? keys.filter(
            (key) =>
              key.toLowerCase().indexOf(needle) !== -1 ||
              String(state.glossary[key]).toLowerCase().indexOf(needle) !== -1 ||
              String(state.details[key] || '').toLowerCase().indexOf(needle) !== -1,
          )
        : keys;

      const add = () => {
        const key = newKey.trim();
        const value = newValue.trim();
        if (!key || !value) {
          setStatus('缩写和解释都要填。');
          return;
        }
        store.setEntry(store.canonicalKey(key), value);
        setNewKey('');
        setNewValue('');
        setStatus('已添加 ' + key);
      };

      const rows = shown.map((key) => {
        const detail = String(state.details[key] || '');
        return h(
          'div',
          { className: 'row', key: key + '\u0000' + state.glossary[key] + '\u0000' + detail.length },
          h(
            'div',
            { className: 'keycell' },
            h('code', { title: key }, key),
            detail ? h('span', { className: 'dtag', title: detail }, '详') : null,
            state.auto[key] ? h('span', { className: 'dtag', title: '模型自动生成；你一改它就变成你的版本' }, '自动') : null,
          ),
          h('input', {
            type: 'text',
            defaultValue: state.glossary[key],
            'aria-label': key + ' 的解释',
            onBlur: (event) => {
              const value = String(event.target.value || '').trim();
              if (!value) {
                event.target.value = state.glossary[key];
                return;
              }
              if (value !== state.glossary[key]) store.setEntry(key, value);
            },
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            },
          }),
          h(
            'div',
            { className: 'acts' },
            detail
              ? h(
                  'button',
                  {
                    type: 'button',
                    title: '清掉这条详细解释',
                    onClick: () => {
                      store.clearDetails(key);
                      setStatus('已清除 ' + key + ' 的详细解释');
                    },
                  },
                  '清详细',
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                onClick: () => {
                  store.removeEntry(key);
                  setStatus('已删除 ' + key);
                },
              },
              '删除',
            ),
          ),
        );
      });

      return h(
        'div',
        { className: 'dsh-abbr-hint-settings' },
        h(
          'p',
          { className: 'lede' },
          '鼠标停在 agent 回复里的缩写上，就会弹出它的解释。卡片里可以追问一句，拿到更详细的解释并存回词典；已收录的缩写带一条虚线下划线，点一下缩写就能直接改解释。词典存在这台机器的浏览器里，随时可以改。',
        ),
        h(
          'label',
          { className: 'toggle' },
          h('input', {
            type: 'checkbox',
            checked: state.enabled,
            onChange: (event) => store.setEnabled(event.target.checked),
          }),
          h('span', null, '在回复里标注缩写并开启悬停提示'),
        ),
        h('p', { className: 'lede', 'data-kind': probe.state }, probe.text),
        h(
          'label',
          { className: 'toggle' },
          h('input', {
            type: 'checkbox',
            checked: state.autoFill,
            onChange: (event) => store.setAutoFill(event.target.checked),
          }),
          h('span', null, '自动补全没收录的缩写：让模型写一条解释并直接收录（会把缩写和所在回复的片段发给模型）'),
        ),
        h('p', { className: 'lede', 'data-kind': autoState.stopped ? 'bad' : 'ok' }, autoFillStatus()),
        h(
          'div',
          { className: 'add' },
          h('input', {
            className: 'key',
            type: 'text',
            placeholder: '缩写，如 RAG',
            value: newKey,
            onChange: (event) => setNewKey(event.target.value),
          }),
          h('input', {
            className: 'val',
            type: 'text',
            placeholder: '它是什么意思',
            value: newValue,
            onChange: (event) => setNewValue(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            },
          }),
          h('button', { type: 'button', className: 'primary', onClick: add }, '添加'),
        ),
        h('input', {
          className: 'search',
          type: 'text',
          placeholder: '搜索缩写或解释',
          value: query,
          onChange: (event) => setQuery(event.target.value),
        }),
        h('div', { className: 'list' }, rows.length ? rows : h('div', { className: 'empty' }, '没有匹配的词条')),
        h(
          'div',
          { className: 'foot' },
          h('span', { className: 'status' }, '共 ' + keys.length + ' 条' + (needle ? '，匹配 ' + shown.length + ' 条' : '')),
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  setStatus('再点一次就会恢复成内置词典。');
                  return;
                }
                setConfirmReset(false);
                store.reset();
                setStatus('已恢复内置词典。');
              },
            },
            confirmReset ? '确认恢复？' : '恢复内置词典',
          ),
          h('span', { className: 'status' }, status),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Setup / teardown                                                    */
    /* ------------------------------------------------------------------ */

    function setupDom() {
      disposed = false;
      started = true;
      injectStyles();

      // A previous plugin generation can leave its overlay behind after a live
      // reload; take the page back before adding our own.
      for (const stale of Array.from(document.querySelectorAll(CARD_SELECTOR + ',' + MENU_SELECTOR))) {
        if (stale.parentNode) stale.parentNode.removeChild(stale);
      }
      cardEl = null;
      menuEl = null;

      const observer = new MutationObserver(onMutations);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });

      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('contextmenu', onContextMenu, true);
      document.addEventListener('pointerdown', onPointerDownOutside, true);

      const hideOnMove = () => {
        cancelHide();
        if (cardEl && !cardEl.hidden && !cardHasFocus()) hideCard(true);
        if (menuEl && !menuEl.hidden) hideMenu();
      };
      window.addEventListener('scroll', hideOnMove, true);
      window.addEventListener('resize', hideOnMove);

      const unsubscribe = store.subscribe(() => scheduleScan(120));

      scheduleScan(500);

      return () => {
        disposed = true;
        started = false;
        observer.disconnect();
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('contextmenu', onContextMenu, true);
        document.removeEventListener('pointerdown', onPointerDownOutside, true);
        window.removeEventListener('scroll', hideOnMove, true);
        window.removeEventListener('resize', hideOnMove);
        unsubscribe();
        if (scanTimer) {
          window.clearTimeout(scanTimer);
          scanTimer = 0;
        }
        if (hideTimer) {
          window.clearTimeout(hideTimer);
          hideTimer = 0;
        }
        if (showTimer) {
          window.clearTimeout(showTimer);
          showTimer = 0;
        }
        clearHighlights();
        occurrences = [];
        segmentMap = new WeakMap();
        if (cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
        cardEl = null;
        if (menuEl && menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
        menuEl = null;
        menuTerm = '';
        menuNode = null;
        activeOcc = null;
        if (document.body) document.body.removeAttribute('data-dsh-abbr-hovering');
      };
    }

    function apply(ctx) {
      ctx.effect(() => {
        let dispose = null;
        let cancelReady = null;
        const start = () => {
          if (started) return;
          dispose = setupDom();
        };
        if (document.body) {
          start();
        } else {
          const onReady = () => start();
          document.addEventListener('DOMContentLoaded', onReady, { once: true });
          cancelReady = () => document.removeEventListener('DOMContentLoaded', onReady);
        }
        return () => {
          if (cancelReady) cancelReady();
          if (dispose) dispose();
        };
      }, 'abbr-hint: decoration layer');

      /* A read-mostly handle for debugging from the page console. */
      try {
        window.__dshAbbrHint = {
          version: '1.0.0',
          store,
          findMatches,
          buildExtraRegexes,
          normalizeTerm,
          auto: autoState,
          match: (text) => findMatches(String(text), buildExtraRegexes(store.get().glossary)),
          rescan: () => rescan(),
          count: () => occurrences.length,
          cardOpen: () => !!(cardEl && !cardEl.hidden),
        };
      } catch (err) {
        /* the global is a convenience only */
      }

      try {
        ctx.inject(['slots'], (scope) => {
          scope.slots.inject('settings.section', () =>
            scope.slots.register(
              {
                name: 'settings.section',
                id: 'abbr-hint',
                order: 60,
                label: '缩写提示',
              },
              AbbrSettings,
            ),
          );
        });
      } catch (err) {
        /* The hover feature stands on its own; the settings page is optional. */
      }
    }

    return { inject: [], apply };
  },
});
