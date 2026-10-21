/* tvadblock Hulu TV interface: a remote-first 10-foot UI drawn over hulu.com from Hulu's own discover API
   (discover.hulu.com/content/v5: view_hubs/home rows, hubs/series/<id> seasons -> episodes). Playback uses
   Hulu's own web player at /watch/<id>, so DRM stays Hulu's. ES2019 for the Tizen 6 engine. */
(function tvabHuluUI() {
    if (window.__tvabHuluUI || !/(^|\.)hulu\.com$/.test(location.hostname)) { return; }
    window.__tvabHuluUI = true;
    var API = 'https://discover.hulu.com/content/v5';
    var onWatch = function () { return /^\/watch\//.test(location.pathname); };
    var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 10009, PLAYPAUSE: 10252, PLAY: 415, PAUSE: 19, FF: 417, RW: 412, STOP: 413 };

    function api(path) {
        var url = path.indexOf('http') === 0 ? path.split('?')[0] : API + path;
        return fetch(url + '?schema=1&limit=999', { credentials: 'include' }).then(function (r) {
            if (r.status === 401 || r.status === 403) { throw new Error('signin'); }
            return r.json();
        });
    }
    function img(item, kind) {
        try {
            var a = item.visuals.artwork[kind || 'horizontal_tile'] || item.visuals.artwork.horizontal;
            return a.image.path + '&size=480x270&format=jpeg';
        } catch (e) { return ''; }
    }
    function title(item) {
        try { return item.visuals.headline || item.name || ''; } catch (e) { return item.name || ''; }
    }
    function eabToId(eab) {
        var m = /^EAB::([0-9a-f-]{36})::/.exec(String(eab || ''));
        return m ? m[1] : null;
    }

    // ---------- styles ----------
    var css = [
        '#tvab-root{position:fixed;inset:0;z-index:2147483646;background:#0b0c0f;color:#fff;font-family:Arial,Helvetica,sans-serif;overflow:hidden}',
        '#tvab-root .hdr{height:90px;display:flex;align-items:center;padding:0 60px;font-size:40px;font-weight:bold;color:#1ce783}',
        '#tvab-root .hdr small{color:#aaa;font-size:24px;margin-left:24px;font-weight:normal}',
        '#tvab-root .rows{position:absolute;top:90px;left:0;right:0;bottom:0;transition:transform .2s}',
        '#tvab-root .row{height:330px;padding-left:60px}',
        '#tvab-root .row h2{font-size:30px;margin:10px 0 12px;color:#ddd;font-weight:bold}',
        '#tvab-root .strip{display:flex;transition:transform .2s;white-space:nowrap}',
        '#tvab-root .tile{flex:0 0 384px;height:216px;margin-right:24px;border-radius:10px;background:#222 center/cover no-repeat;position:relative;box-sizing:border-box;border:5px solid transparent}',
        '#tvab-root .tile.f{border-color:#ffcc00;transform:scale(1.06)}',
        '#tvab-root .tile span{position:absolute;left:0;right:0;bottom:-44px;font-size:24px;color:#eee;overflow:hidden;text-overflow:ellipsis}',
        '#tvab-root .msg{position:absolute;top:40%;width:100%;text-align:center;font-size:36px;color:#ccc}',
        '#tvab-root .btn{display:inline-block;margin-top:30px;padding:18px 40px;border-radius:12px;background:#1ce783;color:#000;font-weight:bold;border:5px solid #ffcc00}'
    ].join('\n');
    function addCss() {
        if (document.getElementById('tvab-ui-css')) { return; }
        var s = document.createElement('style'); s.id = 'tvab-ui-css'; s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
    }

    // ---------- model: a stack of screens, each screen = rows of tiles ----------
    var stack = [];          // [{ title, rows: [{ name, items: [{ label, image, play, browse }] }], r, c }]
    var root = null;
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) { e.className = cls; } if (text != null) { e.textContent = text; } return e; }

    function anyArt(art) {
        if (!art) { return ''; }
        var pref = ['video.horizontal.hero', 'program.tile', 'horizontal_tile', 'horizontal'];
        for (var i = 0; i < pref.length; i++) { if (art[pref[i]] && art[pref[i]].path) { return art[pref[i]].path; } if (art[pref[i]] && art[pref[i]].image && art[pref[i]].image.path) { return art[pref[i]].image.path; } }
        for (var k in art) { var v = art[k]; if (v && (v.path || (v.image && v.image.path))) { return v.path || v.image.path; } }
        return '';
    }
    function toTile(item) {
        if (item._type === 'episode' || item._type === 'movie') {
            var sz = function (u) { return u ? u + (u.indexOf('?') < 0 ? '?' : '&') + 'size=480x270&format=jpeg' : ''; };
            var p = anyArt(item.artwork), fb = anyArt(item.series_artwork);
            return { label: item.name || '', image: sz(p || fb), fallback: sz(fb), play: item.id, browse: null };
        }
        var a = item.actions || {};
        var playId = a.playback ? eabToId(a.playback.eab) : null;
        var browse = a.browse && a.browse.href && /\/hubs\/(series|movie)\//.test(a.browse.href) ? a.browse.href : null;
        return { label: title(item), image: img(item), play: playId, browse: browse };
    }
    function homeScreen() {
        return api('/view_hubs/home').then(function (j) {
            var rows = (j.components || []).filter(function (c) { return c._type === 'collection' && c.items && c.items.length; })
                .map(function (c) { return { name: c.name, items: c.items.map(toTile).filter(function (t) { return t.play || t.browse; }) }; })
                .filter(function (r) { return r.items.length; });
            var cw = rows.findIndex(function (r) { return /continue watching/i.test(r.name); });
            if (cw > 0) { rows.unshift(rows.splice(cw, 1)[0]); }
            return { title: 'Home', rows: rows, r: 0, c: 0 };
        });
    }
    function seriesScreen(href, name) {
        return api(href).then(function (s) {
            var rows = [];
            var eps = (s.components || []).find(function (c) { return /episodes/i.test(c.name || ''); });
            var seasonsP = eps ? api(eps.href) : Promise.resolve(null);
            return seasonsP.then(function (sj) {
                var seasons = sj ? (sj.items || []) : [];
                var loads = seasons.map(function (season) {
                    var items = season.items && season.items.length ? Promise.resolve(season) : api(season.href);
                    return items.then(function (full) {
                        rows.push({ name: season.name, items: (full.items || []).map(function (ep) {
                            var t = toTile(ep);
                            var n = ep.number || (ep.entity_metadata && ep.entity_metadata.episode_number);
                            t.label = (n ? n + '. ' : '') + (ep.name || t.label);
                            return t;
                        }).filter(function (t) { return t.play; }) });
                    }).catch(function () { });
                });
                return Promise.all(loads).then(function () {
                    rows.sort(function (a, b) { return (parseInt(a.name.replace(/\D/g, ''), 10) || 0) - (parseInt(b.name.replace(/\D/g, ''), 10) || 0); });
                    (s.components || []).forEach(function (c) {
                        if (!/episodes/i.test(c.name || '') && c.items && c.items.length && c.items[0]._type !== 'collection') {
                            rows.push({ name: c.name, items: c.items.map(toTile).filter(function (t) { return t.play || t.browse; }) });
                        }
                    });
                    return { title: name || s.name || 'Show', rows: rows.filter(function (r) { return r.items.length; }), r: 0, c: 0 };
                });
            });
        });
    }

    // ---------- view ----------
    function render() {
        var scr = stack[stack.length - 1];
        if (!root) {
            root = el('div'); root.id = 'tvab-root';
            (document.body || document.documentElement).appendChild(root);
        }
        root.textContent = '';
        var hdr = el('div', 'hdr', 'hulu'); hdr.appendChild(el('small', null, scr.title + '  ·  No Ads'));
        root.appendChild(hdr);
        var rowsEl = el('div', 'rows'); root.appendChild(rowsEl);
        scr.rows.forEach(function (row, ri) {
            var rEl = el('div', 'row'); if (ri < scr.r - 2 || ri > scr.r + 4) { rowsEl.appendChild(rEl); return; } rEl.appendChild(el('h2', null, row.name));
            var strip = el('div', 'strip');
            row.items.forEach(function (t, ci) {
                var tile = el('div', 'tile' + (ri === scr.r && ci === scr.c ? ' f' : ''));
                var cc = ri === scr.r ? scr.c : (row.c || 0);
                // only load images near the highlight (TV memory/CPU): rows r-1..r+2, tiles c-2..c+6
                if (t.image && ri >= scr.r - 1 && ri <= scr.r + 2 && ci >= cc - 2 && ci <= cc + 6) { (function (tileEl, tt) { tileEl.style.backgroundImage = 'url("' + tt.image + '")';
                    if (tt.fallback && tt.fallback !== tt.image) { var probe = new Image(); probe.onerror = function () { tileEl.style.backgroundImage = 'url("' + tt.fallback + '")'; }; probe.src = tt.image; } })(tile, t); }
                tile.appendChild(el('span', null, t.label));
                strip.appendChild(tile);
            });
            strip.style.transform = 'translateX(' + (-Math.max(0, (ri === scr.r ? scr.c : row.c || 0) - 1) * 408) + 'px)';
            rEl.appendChild(strip); rowsEl.appendChild(rEl);
        });
        rowsEl.style.transform = 'translateY(' + (-Math.max(0, scr.r) * 330) + 'px)';
    }
    function message(text, buttonText) {
        if (!root) { root = el('div'); root.id = 'tvab-root'; (document.body || document.documentElement).appendChild(root); }
        root.textContent = '';
        var m = el('div', 'msg', text);
        if (buttonText) { m.appendChild(el('br')); m.appendChild(el('div', 'btn', buttonText)); }
        root.appendChild(m);
    }
    function push(p) {
        message('Loading…');
        return p.then(function (scr) { stack.push(scr); render(); }).catch(function (e) {
            if (String(e && e.message) === 'signin') { signinPrompt(); } else { message('Could not load Hulu. Press OK to retry.'); retry = function () { start(); }; }
        });
    }
    var retry = null, signin = false;
    function signinPrompt() {
        signin = true;
        message('Sign in to Hulu once. Press OK, then type your email and password with the TV keyboard.', 'Sign in');
    }
    function hideUI() { if (root) { root.style.display = 'none'; } }
    function showUI() { if (root) { root.style.display = ''; } }

    // ---------- keys ----------
    function onKey(e) {
        var k = e.keyCode;
        if (onWatch()) { return playerKey(e); }
        if (!root || root.style.display === 'none') { return; }
        if (signin) {
            if (k === KEY.OK) { e.preventDefault(); signin = false; hideUI(); location.href = 'https://auth.hulu.com/web/login'; }
            return;
        }
        if (retry && k === KEY.OK) { e.preventDefault(); var f = retry; retry = null; f(); return; }
        var scr = stack[stack.length - 1]; if (!scr) { return; }
        var row = scr.rows[scr.r];
        var handled = true;
        if (k === KEY.RIGHT) { scr.c = Math.min(row.items.length - 1, scr.c + 1); }
        else if (k === KEY.LEFT) { scr.c = Math.max(0, scr.c - 1); }
        else if (k === KEY.DOWN) { row.c = scr.c; scr.r = Math.min(scr.rows.length - 1, scr.r + 1); scr.c = Math.min(scr.rows[scr.r].c || 0, scr.rows[scr.r].items.length - 1); }
        else if (k === KEY.UP) { row.c = scr.c; scr.r = Math.max(0, scr.r - 1); scr.c = Math.min(scr.rows[scr.r].c || 0, scr.rows[scr.r].items.length - 1); }
        else if (k === KEY.OK) {
            var t = row.items[scr.c];
            if (t.browse && stack.length === 1 && !/^\d+\./.test(t.label)) { push(seriesScreen(t.browse, t.label)); return stop(e); }
            if (t.play) { sessionStorage.setItem('tvab-stack', JSON.stringify(stack)); location.href = '/watch/' + t.play; return stop(e); }
            if (t.browse) { push(seriesScreen(t.browse, t.label)); return stop(e); }
        }
        else if (k === KEY.BACK) {
            if (stack.length > 1) { stack.pop(); render(); }
            else { try { tizen.application.getCurrentApplication().exit(); } catch (x) { } }
        }
        else { handled = false; }
        if (handled) { stop(e); render(); }
    }
    function stop(e) { e.preventDefault(); e.stopPropagation(); }
    function video() { return document.querySelector('video'); }
    function playerKey(e) {
        var v = video(), k = e.keyCode;
        if (k === KEY.BACK) { stop(e); location.href = '/hub/home'; return; }
        if (!v) { return; }
        if (k === KEY.OK || k === KEY.PLAYPAUSE) { stop(e); if (v.paused) { v.play(); } else { v.pause(); } }
        else if (k === KEY.PLAY) { stop(e); v.play(); }
        else if (k === KEY.PAUSE || k === KEY.STOP) { stop(e); v.pause(); }
        else if (k === KEY.RIGHT || k === KEY.FF) { stop(e); v.currentTime = Math.min(v.duration || 1e9, v.currentTime + 10); }
        else if (k === KEY.LEFT || k === KEY.RW) { stop(e); v.currentTime = Math.max(0, v.currentTime - 10); }
    }
    document.addEventListener('keydown', onKey, true);

    // ---------- boot ----------
    function start() {
        addCss();
        if (onWatch()) { return; }
        if (/auth\.hulu\.com|\/login|\/account/.test(location.href)) { return; } // let nav.js handle sign-in pages
        var saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('tvab-stack') || 'null'); sessionStorage.removeItem('tvab-stack'); } catch (x) { }
        if (saved && saved.length) { stack = saved; render(); return; }
        stack = []; push(homeScreen());
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); } else { start(); }
})();
