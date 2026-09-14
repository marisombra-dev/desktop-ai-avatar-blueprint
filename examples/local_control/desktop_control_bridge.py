"""Sanitized Windows local-control bridge from the 2026-09-14 validated reference build.

Dependencies: psutil, pywin32, pywinauto. The safety tier deliberately omits
file delete, silent overwrite, arbitrary shell execution, and unrestricted process killing.
"""

import base64
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import psutil
import win32con
import win32gui
import win32process
from pywinauto import Desktop
from pywinauto.keyboard import send_keys

HOME = Path.home()
PATH_ALIASES = {
    'home': HOME,
    'desktop': HOME / 'Desktop',
    'documents': HOME / 'Documents',
    'downloads': HOME / 'Downloads',
}
SKIP_DIRS = {'.git', 'node_modules', '__pycache__', 'appdata'}
APP_ALIASES = {
    'chrome': 'chrome.exe', 'google chrome': 'chrome.exe',
    'edge': 'msedge.exe', 'microsoft edge': 'msedge.exe',
    'notepad': 'notepad.exe', 'calculator': 'calc.exe',
    'explorer': 'explorer.exe', 'file explorer': 'explorer.exe',
    'powershell': 'powershell.exe', 'command prompt': 'cmd.exe',
    'vscode': 'code', 'visual studio code': 'code',
}


def emit(value):
    data = (json.dumps(value, ensure_ascii=True) + '\n').encode('ascii')
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def fail(message):
    emit({'ok': False, 'error': str(message)})
    raise SystemExit(1)


def resolve_path(raw, default='home'):
    value = str(raw or default).strip()
    alias = PATH_ALIASES.get(value.lower())
    if alias is not None:
        return alias
    expanded = os.path.expandvars(os.path.expanduser(value))
    path = Path(expanded)
    if not path.is_absolute():
        path = HOME / path
    return path.resolve(strict=False)


def stat_item(path):
    info = path.stat()
    return {
        'name': path.name,
        'path': str(path),
        'isDirectory': path.is_dir(),
        'size': info.st_size,
        'modified': info.st_mtime,
    }


def file_find(args):
    root = resolve_path(args.get('root') or 'downloads')
    query = str(args.get('query') or '').strip().lower()
    if not query:
        raise ValueError('A file search query is required.')
    if not root.exists() or not root.is_dir():
        raise ValueError(f'Search root does not exist: {root}')
    found = []
    visited = 0
    base_depth = len(root.parts)
    for current, dirs, files in os.walk(root):
        current_path = Path(current)
        depth = len(current_path.parts) - base_depth
        dirs[:] = [d for d in dirs if d.lower() not in SKIP_DIRS and not d.startswith('.')]
        if depth >= 6:
            dirs[:] = []
        for name in files + dirs:
            visited += 1
            if query in name.lower():
                path = current_path / name
                try:
                    found.append(stat_item(path))
                except OSError:
                    pass
            if len(found) >= 25 or visited >= 20000:
                break
        if len(found) >= 25 or visited >= 20000:
            break
    found.sort(key=lambda item: item['modified'], reverse=True)
    return {'ok': True, 'root': str(root), 'results': found[:25]}


def file_list(args):
    path = resolve_path(args.get('path') or args.get('root') or 'downloads')
    if not path.exists() or not path.is_dir():
        raise ValueError(f'Directory does not exist: {path}')
    items = []
    for child in path.iterdir():
        try:
            items.append(stat_item(child))
        except OSError:
            continue
    items.sort(key=lambda item: (not item['isDirectory'], item['name'].lower()))
    return {'ok': True, 'path': str(path), 'items': items[:100]}


def resolve_file_target(args):
    raw_path = str(args.get('path') or '').strip()
    if raw_path:
        return resolve_path(raw_path)
    query = str(args.get('query') or '').strip()
    if not query:
        raise ValueError('A file path or search query is required.')
    root_path = resolve_path(args.get('root') or 'downloads')
    if root_path.exists() and root_path.is_dir():
        direct = [child for child in root_path.iterdir() if child.is_file() and child.name.lower() == query.lower()]
        if len(direct) == 1:
            return direct[0]
    result = file_find({'root': str(root_path), 'query': query})
    rows = [item for item in result.get('results', []) if not item.get('isDirectory')]
    exact = [item for item in rows if item.get('name', '').lower() == query.lower()]
    chosen = exact[0] if len(exact) == 1 else rows[0] if len(rows) == 1 else None
    if not chosen:
        names = ', '.join(item.get('name', '') for item in rows[:5])
        raise ValueError(f'File query is ambiguous: {query}' + (f' ({names})' if names else ''))
    return Path(chosen['path'])


def file_read(args):
    path = resolve_file_target(args)
    if not path.exists() or not path.is_file():
        raise ValueError(f'File does not exist: {path}')
    if path.stat().st_size > 131072:
        raise ValueError('File is larger than the 128 KB voice-read limit.')
    data = path.read_bytes()
    if b'\x00' in data:
        raise ValueError('This appears to be a binary file. I can open it, but not read it as text yet.')
    text = data.decode('utf-8-sig', errors='replace')
    return {'ok': True, 'path': str(path), 'text': text[:120000]}


def file_open(args):
    path = resolve_file_target(args)
    if not path.exists():
        raise ValueError(f'Path does not exist: {path}')
    os.startfile(str(path))
    filename = path.name.lower()
    deadline = time.time() + 4.0
    while time.time() < deadline:
        matches = [item for item in visible_windows() if filename in item.get('title', '').lower()]
        if matches:
            return {'ok': True, 'verified': True, 'opened': str(path), 'window': matches[0]}
        time.sleep(0.10)
    return {'ok': True, 'verified': False, 'opened': str(path), 'warning': 'The open request was sent, but no matching application window was confirmed.'}


def resolve_transfer_destination(raw, source, action):
    value = str(raw or '').strip()
    if not value:
        raise ValueError('A destination is required.')
    alias = PATH_ALIASES.get(value.lower())
    if alias is not None:
        return alias / source.name
    candidate = Path(os.path.expandvars(os.path.expanduser(value)))
    if action == 'rename' and not candidate.is_absolute() and candidate.parent == Path('.'):
        return source.with_name(value)
    destination = resolve_path(value)
    if destination.exists() and destination.is_dir():
        return destination / source.name
    return destination


def file_transfer(args, action):
    source = resolve_file_target(args)
    destination = resolve_transfer_destination(args.get('destination'), source, action)
    if not source.exists():
        raise ValueError(f'Source does not exist: {source}')
    if destination.exists():
        raise ValueError(f'Destination already exists: {destination}')
    destination.parent.mkdir(parents=True, exist_ok=True)
    if action == 'copy':
        if source.is_dir(): shutil.copytree(source, destination)
        else: shutil.copy2(source, destination)
    else:
        shutil.move(str(source), str(destination))
    if not destination.exists():
        raise ValueError(f'Filesystem did not confirm {action}: {destination}')
    if action in ('move', 'rename') and source.exists():
        raise ValueError(f'Filesystem did not confirm source removal after {action}: {source}')
    return {'ok': True, 'verified': True, 'action': action,
            action: {'from': str(source), 'to': str(destination)},
            'from': str(source), 'to': str(destination)}

def file_control(args):
    action = args.get('action')
    if action == 'find': return file_find(args)
    if action == 'list': return file_list(args)
    if action == 'read': return file_read(args)
    if action == 'open': return file_open(args)
    if action in ('copy', 'move', 'rename'): return file_transfer(args, 'copy' if action == 'copy' else action)
    raise ValueError(f'Unsupported file action: {action}')


def chrome_windows():
    handles = []
    def callback(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd): return True
        try:
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            if psutil.Process(pid).name().lower() == 'chrome.exe' and win32gui.GetClassName(hwnd) == 'Chrome_WidgetWin_1':
                handles.append(hwnd)
        except Exception:
            pass
        return True
    win32gui.EnumWindows(callback, None)
    return [Desktop(backend='uia').window(handle=hwnd) for hwnd in handles]


def clean_tab_title(title):
    return re.sub(r'\s+- Memory usage - [0-9.,]+ [KMG]B$', '', title or '').strip()


def chrome_tab_items(window):
    items = []
    for tab in window.descendants(control_type='TabItem'):
        try:
            parent = tab.parent()
            if tab.element_info.class_name == 'Tab' and parent.element_info.class_name == 'TabContainerImpl':
                items.append(tab)
        except Exception:
            continue
    return items


def browser_tabs():
    rows = []
    for window_index, window in enumerate(chrome_windows()):
        for tab_index, tab in enumerate(chrome_tab_items(window)):
            try:
                raw = tab.window_text() or ''
                rows.append({
                    'window': window_index,
                    'index': tab_index,
                    'title': clean_tab_title(raw),
                    'selected': bool(tab.is_selected()),
                })
            except Exception:
                continue
    return rows


def find_tab(query):
    needle = str(query or '').strip().lower()
    tabs = browser_tabs()
    if needle in ('current', 'active', 'this', ''):
        match = next((item for item in tabs if item['selected']), None)
    else:
        exact = next((item for item in tabs if item['title'].lower() == needle), None)
        match = exact or next((item for item in tabs if needle in item['title'].lower()), None)
        if not match and any(word in needle for word in ('github', 'git hub', 'repo', 'repository')):
            match = next((item for item in tabs if 'github' in item['title'].lower() or re.match(r'^[\w.-]+/[\w.-]+(?::| ·|$)', item['title'])), None)
        if not match and ('chatgpt' in needle or needle in ('gpt', 'chat gpt')):
            match = next((item for item in tabs if 'chatgpt' in item['title'].lower() or 'avatar ethan' in item['title'].lower()), None)
        if not match and 'youtube' in needle:
            match = next((item for item in tabs if 'youtube' in item['title'].lower()), None)
    if not match:
        raise ValueError(f'No Chrome tab matched: {query}')
    return match


def selected_tab(tabs=None):
    rows = tabs if tabs is not None else browser_tabs()
    return next((item for item in rows if item.get('selected')), None)


def wait_for_tabs(predicate, timeout=4.0):
    deadline = time.time() + timeout
    latest = browser_tabs()
    while time.time() < deadline:
        latest = browser_tabs()
        if predicate(latest):
            return latest
        time.sleep(0.12)
    return latest


def resolve_weather_url(query):
    value = str(query or '').strip()
    if not value:
        raise ValueError('A weather location is required.')
    params = urllib.parse.urlencode({'q': value, 'format': 'jsonv2', 'limit': 1})
    request = urllib.request.Request('https://nominatim.openstreetmap.org/search?' + params, headers={'User-Agent': 'DesktopEthan/0.1 browser-weather'})
    rows = json.loads(urllib.request.urlopen(request, timeout=8).read().decode('utf-8'))
    if not rows:
        raise ValueError(f'Could not resolve weather location: {value}')
    lat, lon = rows[0]['lat'], rows[0]['lon']
    return f'https://weather.com/en-GB/weather/today/l/{lat},{lon}'



def active_chrome_window():
    windows = chrome_windows()
    for window_index, window in enumerate(windows):
        tabs = chrome_tab_items(window)
        for tab_index, tab in enumerate(tabs):
            try:
                if tab.is_selected():
                    return window, {'window': window_index, 'index': tab_index, 'title': clean_tab_title(tab.window_text() or ''), 'selected': True}
            except Exception:
                continue
    raise ValueError('Chrome did not report an active browser tab.')


def active_page_state(window=None):
    window = window or active_chrome_window()[0]
    docs = [d for d in window.descendants(control_type='Document') if (d.window_text() or '').strip()]
    document = docs[0] if docs else None
    title = (document.window_text() or '').strip() if document else ''
    address = ''
    for edit in window.descendants(control_type='Edit'):
        if edit.element_info.class_name == 'OmniboxViewViews':
            address = (edit.window_text() or '').strip()
            break
    scroll = None
    if document is not None:
        try: scroll = float(document.iface_scroll.CurrentVerticalScrollPercent)
        except Exception: pass
    return {'title': title, 'address': address, 'scroll': scroll}

def browser_control(args):
    action = args.get('action')
    requested_action = action
    if action in ('search-web', 'search-youtube', 'search-wikipedia', 'search-github'):
        query = str(args.get('query') or '').strip()
        if not query:
            raise ValueError('A browser search query is required.')
        encoded = urllib.parse.quote_plus(query)
        urls = {
            'search-web': f'https://www.google.com/search?q={encoded}',
            'search-youtube': f'https://www.youtube.com/results?search_query={encoded}',
            'search-wikipedia': f'https://en.wikipedia.org/wiki/Special:Search?search={encoded}',
            'search-github': f'https://github.com/search?q={encoded}',
        }
        args = {**args, 'action': 'open-url', 'url': urls[action]}
        action = 'open-url'
    elif action == 'weather':
        args = {**args, 'action': 'open-url', 'url': resolve_weather_url(args.get('query'))}
        action = 'open-url'
    if action == 'list-tabs':
        return {'ok': True, 'tabs': browser_tabs()}
    if action == 'new-tab':
        before = browser_tabs()
        windows = chrome_windows()
        if not windows:
            raise ValueError('Chrome is not open.')
        windows[0].set_focus()
        send_keys('^t')
        after = wait_for_tabs(lambda rows: len(rows) > len(before))
        if len(after) <= len(before):
            raise ValueError('Chrome did not confirm that a new tab opened.')
        active = selected_tab(after)
        return {'ok': True, 'verified': True, 'action': 'new-tab', 'tab': active}
    if action == 'open-url':
        url = str(args.get('url') or '').strip()
        if not re.match(r'^https?://', url, re.I):
            raise ValueError('A complete http:// or https:// URL is required.')
        before = browser_tabs()
        before_active = selected_tab(before)
        before_positions = {(item['window'], item['index']) for item in before}
        os.startfile(url)
        after = wait_for_tabs(lambda rows: len(rows) > len(before), timeout=4.0)
        if len(after) > len(before):
            added = [item for item in after if (item['window'], item['index']) not in before_positions]
            target = added[-1] if added else after[-1]
            windows = chrome_windows()
            window = windows[target['window']]
            tabs = chrome_tab_items(window)
            window.set_focus()
            tabs[target['index']].click_input()
            after = wait_for_tabs(lambda rows: any(item.get('selected') and item['window'] == target['window'] and item['index'] == target['index'] for item in rows), timeout=2.0)
            active = selected_tab(after)
        else:
            before_title = (before_active or {}).get('title')
            after = wait_for_tabs(lambda rows: selected_tab(rows) is not None and selected_tab(rows).get('title') != before_title, timeout=2.0)
            active = selected_tab(after)
        if not active:
            raise ValueError('Chrome did not confirm that the requested page opened and became active.')
        expected_host = urllib.parse.urlparse(url).netloc.lower().removeprefix('www.')
        deadline = time.time() + 6.0
        page = None
        while time.time() < deadline:
            try:
                window, _ = active_chrome_window()
                page = active_page_state(window)
                address = str(page.get('address') or '').lower().removeprefix('https://').removeprefix('http://').removeprefix('www.')
                if expected_host and expected_host in address: break
            except Exception:
                pass
            time.sleep(0.12)
        if not page or expected_host not in str(page.get('address') or '').lower().removeprefix('https://').removeprefix('http://').removeprefix('www.'):
            raise ValueError('Chrome did not confirm that the requested page finished opening.')
        active = selected_tab()
        return {'ok': True, 'verified': True, 'action': requested_action, 'opened': url, 'tab': active, 'page': page}
    if action == 'click-link':
        query = str(args.get('query') or '').strip()
        if not query: raise ValueError('Visible link text is required.')
        window, _ = active_chrome_window()
        before = active_page_state(window)
        links = [x for x in window.descendants(control_type='Hyperlink') if (x.window_text() or '').strip()]
        exact = [x for x in links if (x.window_text() or '').strip().lower() == query.lower()]
        partial = [x for x in links if query.lower() in (x.window_text() or '').strip().lower()]
        matches = exact or partial
        if not matches: raise ValueError(f'No visible link matched: {query}')
        if not exact and len(matches) != 1: raise ValueError(f'Visible link text is ambiguous: {query}')
        label = (matches[0].window_text() or '').strip()
        target = next((x for x in matches if x.is_visible()), matches[0])
        try:
            target.invoke()
        except Exception:
            target.click_input()
        deadline = time.time() + 4.0
        after = before
        while time.time() < deadline:
            after = active_page_state(window)
            if after['address'] != before['address'] or after['title'] != before['title']: break
            time.sleep(0.12)
        if after['address'] == before['address'] and after['title'] == before['title']:
            raise ValueError(f'Chrome did not confirm navigation after clicking: {label}')
        return {'ok': True, 'verified': True, 'action': 'click-link', 'clicked': label, 'page': after}

    if action in ('back', 'forward'):
        window, _ = active_chrome_window()
        before = active_page_state(window)
        label = 'Back' if action == 'back' else 'Forward'
        buttons = [b for b in window.descendants(control_type='Button') if (b.window_text() or '').strip() == label]
        if not buttons or not buttons[0].is_enabled(): raise ValueError(f'Chrome {label.lower()} is not available.')
        buttons[0].click_input()
        deadline = time.time() + 4.0
        after = before
        while time.time() < deadline:
            after = active_page_state(window)
            if after['address'] != before['address'] or after['title'] != before['title']: break
            time.sleep(0.12)
        if after['address'] == before['address'] and after['title'] == before['title']:
            raise ValueError(f'Chrome did not confirm {label.lower()} navigation.')
        return {'ok': True, 'verified': True, 'action': action, 'page': after}

    if action in ('scroll-down', 'scroll-up'):
        window, _ = active_chrome_window()
        deadline = time.time() + 4.0
        docs = []
        while time.time() < deadline and not docs:
            docs = [d for d in window.descendants(control_type='Document') if (d.window_text() or '').strip()]
            if not docs: time.sleep(0.12)
        if not docs: raise ValueError('Chrome did not expose the active page for scrolling.')
        document = docs[0]
        try: before = float(document.iface_scroll.CurrentVerticalScrollPercent)
        except Exception: raise ValueError('Chrome did not expose scroll position for this page.')
        document.iface_scroll.Scroll(2, 3 if action == 'scroll-down' else 0)
        time.sleep(0.35)
        after = float(document.iface_scroll.CurrentVerticalScrollPercent)
        changed = after > before + 0.05 if action == 'scroll-down' else after < before - 0.05
        if not changed: raise ValueError(f'Chrome did not confirm {action.replace("-", " ")}.')
        return {'ok': True, 'verified': True, 'action': action, 'beforeScroll': before, 'afterScroll': after, 'page': active_page_state(window)}

    if action in ('next-tab', 'previous-tab'):
        rows = browser_tabs()
        if len(rows) < 2:
            raise ValueError('Chrome does not have another browser tab to switch to.')
        current = next((index for index, item in enumerate(rows) if item.get('selected')), None)
        if current is None:
            raise ValueError('Chrome did not report an active browser tab.')
        step = 1 if action == 'next-tab' else -1
        target = rows[(current + step) % len(rows)]
        args = {**args, 'action': 'switch-tab', 'query': target['title']}
        action = 'switch-tab'
    if action in ('switch-tab', 'close-tab'):
        match = find_tab(args.get('query'))
        windows = chrome_windows()
        window = windows[match['window']]
        tabs = chrome_tab_items(window)
        tab = tabs[match['index']]
        window.set_focus()
        tab.click_input()
        if action == 'switch-tab':
            after = wait_for_tabs(lambda rows: bool(selected_tab(rows)) and selected_tab(rows).get('title') == match['title'], timeout=2.0)
            active = selected_tab(after)
            if not active or active.get('title') != match['title']:
                raise ValueError(f'Chrome did not confirm the switch to: {match["title"]}')
            return {'ok': True, 'verified': True, 'action': 'switch-tab', 'tab': active}
        before_count = len(browser_tabs())
        time.sleep(0.08)
        send_keys('^w')
        after = wait_for_tabs(lambda rows: len(rows) < before_count or not any(item.get('title') == match['title'] for item in rows), timeout=2.0)
        if len(after) >= before_count and any(item.get('title') == match['title'] for item in after):
            raise ValueError(f'Chrome did not confirm that the tab closed: {match["title"]}')
        return {'ok': True, 'verified': True, 'action': 'close-tab', 'closed': match['title'], 'tab': selected_tab(after)}
    raise ValueError(f'Unsupported browser action: {action}')


def visible_windows():
    rows = []
    foreground = win32gui.GetForegroundWindow()
    def callback(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd): return True
        title = win32gui.GetWindowText(hwnd).strip()
        if not title: return True
        try:
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            process = psutil.Process(pid).name()
        except Exception:
            pid, process = 0, ''
        rows.append({'hwnd': int(hwnd), 'title': title, 'process': process, 'pid': pid,
                     'minimized': bool(win32gui.IsIconic(hwnd)),
                     'maximized': bool(win32gui.GetWindowPlacement(hwnd)[1] == win32con.SW_SHOWMAXIMIZED),
                     'foreground': int(hwnd) == int(foreground)})
        return True
    win32gui.EnumWindows(callback, None)
    return rows

_WINDOW_QUERY_ALIASES = {
    'google chrome': ('chrome', 'chrome.exe'), 'chrome': ('chrome', 'chrome.exe'),
    'microsoft edge': ('edge', 'msedge.exe'), 'edge': ('edge', 'msedge.exe'),
    'notepad': ('notepad', 'notepad.exe'), 'calculator': ('calculator',), 'calc': ('calculator',),
    'file explorer': ('explorer.exe',), 'visual studio code': ('visual studio code', 'code.exe'),
    'vscode': ('visual studio code', 'code.exe'), 'vs code': ('visual studio code', 'code.exe'),
    'powershell': ('powershell', 'windowsterminal.exe'), 'command prompt': ('command prompt', 'cmd.exe'),
    'unreal': ('unreal', 'unrealeditor.exe'), 'unreal editor': ('unreal', 'unrealeditor.exe'),
    'spotify': ('spotify', 'spotify.exe'),
}
_IGNORE_WINDOW_TITLES = {'program manager', 'shell handwriting canvas', 'windows input experience', 'nvidia geforce overlay'}


def _window_matches(item, query):
    needle = str(query or '').strip().lower()
    title = item['title'].lower()
    process = item['process'].lower()
    if title in _IGNORE_WINDOW_TITLES:
        return False
    terms = _WINDOW_QUERY_ALIASES.get(needle, (needle,))
    return any(term and (term == title or term == process or term in title or term in process) for term in terms)


def matching_windows(query):
    needle = str(query or '').strip().lower()
    if not needle:
        raise ValueError('A window title or application name is required.')
    rows = [item for item in visible_windows() if _window_matches(item, needle)]
    def rank(item):
        non_shell = item['process'].lower() != 'applicationframehost.exe'
        exact = item['title'].lower() == needle or item['process'].lower() == needle
        return (bool(item.get('foreground')), non_shell, not bool(item.get('minimized')), exact)
    return sorted(rows, key=rank, reverse=True)


def find_window(query):
    matches = matching_windows(query)
    if not matches:
        raise ValueError(f'No visible window matched: {query}')
    return matches[0]


def _wait_window(hwnd, predicate, timeout=3.0):
    deadline = time.time() + timeout
    latest = None
    while time.time() < deadline:
        latest = next((item for item in visible_windows() if item['hwnd'] == int(hwnd)), None)
        if predicate(latest): return latest
        time.sleep(0.08)
    return latest


def _wait_for_query(query, timeout=5.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            return find_window(query)
        except Exception:
            time.sleep(0.10)
    return None


def launch_app(name):
    value = str(name or '').strip()
    if not value:
        raise ValueError('An application name is required.')
    existing = matching_windows(value)
    if existing:
        match = existing[0]
        hwnd = match['hwnd']
        if win32gui.IsIconic(hwnd): win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        try: win32gui.SetForegroundWindow(hwnd)
        except Exception: win32gui.BringWindowToTop(hwnd)
        return {'ok': True, 'verified': True, 'action': 'launch', 'launched': value, 'existing': True, 'window': find_window(value)}
    target = APP_ALIASES.get(value.lower(), value)
    path = Path(os.path.expandvars(os.path.expanduser(target)))
    if path.exists():
        os.startfile(str(path))
    else:
        resolved = shutil.which(target)
        if not resolved:
            raise ValueError(f'Application is not in the approved/available launch set: {value}')
        subprocess.Popen([resolved], close_fds=True,
                         creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS)
    match = _wait_for_query(value, timeout=5.0)
    if not match:
        raise ValueError(f'Windows did not confirm a visible {value} window opened.')
    return {'ok': True, 'verified': True, 'action': 'launch', 'launched': value, 'window': match}


def window_control(args):
    action = args.get('action')
    if action == 'list':
        return {'ok': True, 'windows': visible_windows()[:80]}
    if action == 'launch':
        return launch_app(args.get('app') or args.get('query'))

    query = args.get('query')
    match = find_window(query)
    candidates = matching_windows(query)
    shell = next((item for item in candidates if item['process'].lower() == 'applicationframehost.exe'), None)
    control = shell if shell and action in ('focus', 'minimize', 'maximize', 'restore') else match
    hwnd = control['hwnd']
    if action == 'focus':
        if win32gui.IsIconic(hwnd): win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
        try:
            Desktop(backend='uia').window(handle=hwnd).set_focus()
        except Exception:
            try: win32gui.SetForegroundWindow(hwnd)
            except Exception: win32gui.BringWindowToTop(hwnd)
        after = _wait_window(hwnd, lambda item: bool(item and item.get('foreground') and not item.get('minimized')), timeout=3.0)
        if not after or not after.get('foreground') or after.get('minimized'):
            raise ValueError(f'Windows did not confirm focus for: {match["title"]}')
    elif action == 'minimize':
        win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
        after = _wait_window(hwnd, lambda item: bool(item and item.get('minimized')), timeout=2.0)
        if not after or not after.get('minimized'):
            raise ValueError(f'Windows did not confirm minimization for: {match["title"]}')
    elif action == 'maximize':
        win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
        after = _wait_window(hwnd, lambda item: bool(item and item.get('maximized')), timeout=2.0)
        if not after or not after.get('maximized'):
            raise ValueError(f'Windows did not confirm maximization for: {match["title"]}')
    elif action == 'restore':
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        after = _wait_window(hwnd, lambda item: bool(item and not item.get('minimized') and not item.get('maximized')), timeout=2.0)
        if not after or after.get('minimized') or after.get('maximized'):
            raise ValueError(f'Windows did not confirm restore for: {match["title"]}')
    elif action == 'close':
        query = args.get('query')
        needle = str(query or '').strip().lower()
        candidates = matching_windows(query) if needle in _WINDOW_QUERY_ALIASES else [match]
        for candidate in candidates:
            try: win32gui.PostMessage(candidate['hwnd'], win32con.WM_CLOSE, 0, 0)
            except Exception: pass
        deadline = time.time() + 3.0
        remaining = candidates
        while time.time() < deadline:
            remaining = matching_windows(query) if needle in _WINDOW_QUERY_ALIASES else [item for item in visible_windows() if item['hwnd'] == hwnd]
            if not remaining: break
            time.sleep(0.08)
        if remaining:
            raise ValueError(f'Windows did not confirm close for: {match["title"]}')
        after = None
    else:
        raise ValueError(f'Unsupported window action: {action}')
    return {'ok': True, 'verified': True, 'action': action, 'window': after or match}

def main():
    if len(sys.argv) < 2:
        raise ValueError('Missing control request payload.')
    payload = sys.argv[1]
    if payload.startswith('b64:'):
        payload = base64.b64decode(payload[4:]).decode('utf-8')
    request = json.loads(payload)
    if not isinstance(request, dict):
        raise ValueError('Control request must be a JSON object.')
    domain = request.get('domain')
    if domain == 'browser':
        result = browser_control(request)
    elif domain == 'file':
        result = file_control(request)
    elif domain == 'window':
        result = window_control(request)
    else:
        raise ValueError(f'Unsupported control domain: {domain}')
    emit(result)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        fail(exc)
