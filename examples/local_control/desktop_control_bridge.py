"""Sanitized reference bridge for narrow Windows desktop control.

Validated architecture from the Desktop Ethan reference build, 2026-09-12.
Dependencies: psutil, pywin32, pywinauto.

The first tier deliberately separates browser, file, and window/application
capabilities and does not expose arbitrary shell execution or delete.
"""

import base64
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import psutil
import win32con
import win32gui
import win32process
from pywinauto import Desktop
from pywinauto.keyboard import send_keys

HOME = Path.home()
PATH_ALIASES = {
    "home": HOME,
    "desktop": HOME / "Desktop",
    "documents": HOME / "Documents",
    "downloads": HOME / "Downloads",
}
SKIP_DIRS = {".git", "node_modules", "__pycache__", "appdata"}
APP_ALIASES = {
    "chrome": "chrome.exe",
    "google chrome": "chrome.exe",
    "edge": "msedge.exe",
    "microsoft edge": "msedge.exe",
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "powershell": "powershell.exe",
    "command prompt": "cmd.exe",
    "vscode": "code",
    "visual studio code": "code",
}


def emit(value):
    print(json.dumps(value, ensure_ascii=False))


def fail(message):
    emit({"ok": False, "error": str(message)})
    raise SystemExit(1)


def resolve_path(raw, default="home"):
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
        "name": path.name,
        "path": str(path),
        "isDirectory": path.is_dir(),
        "size": info.st_size,
        "modified": info.st_mtime,
    }


def file_find(args):
    root = resolve_path(args.get("root") or "downloads")
    query = str(args.get("query") or "").strip().lower()
    if not query:
        raise ValueError("A file search query is required.")
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Search root does not exist: {root}")
    found = []
    visited = 0
    base_depth = len(root.parts)
    for current, dirs, files in os.walk(root):
        current_path = Path(current)
        depth = len(current_path.parts) - base_depth
        dirs[:] = [d for d in dirs if d.lower() not in SKIP_DIRS and not d.startswith(".")]
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
    found.sort(key=lambda item: item["modified"], reverse=True)
    return {"ok": True, "root": str(root), "results": found[:25]}


def file_list(args):
    path = resolve_path(args.get("path") or args.get("root") or "downloads")
    if not path.exists() or not path.is_dir():
        raise ValueError(f"Directory does not exist: {path}")
    items = []
    for child in path.iterdir():
        try:
            items.append(stat_item(child))
        except OSError:
            continue
    items.sort(key=lambda item: (not item["isDirectory"], item["name"].lower()))
    return {"ok": True, "path": str(path), "items": items[:100]}


def file_read(args):
    path = resolve_path(args.get("path"))
    if not path.exists() or not path.is_file():
        raise ValueError(f"File does not exist: {path}")
    if path.stat().st_size > 131072:
        raise ValueError("File is larger than the 128 KB voice-read limit.")
    data = path.read_bytes()
    if b"\x00" in data:
        raise ValueError("This appears to be a binary file. I can open it, but not read it as text yet.")
    text = data.decode("utf-8-sig", errors="replace")
    return {"ok": True, "path": str(path), "text": text[:120000]}


def file_open(args):
    path = resolve_path(args.get("path"))
    if not path.exists():
        raise ValueError(f"Path does not exist: {path}")
    os.startfile(str(path))
    return {"ok": True, "opened": str(path)}


def file_transfer(args, action):
    source = resolve_path(args.get("path"))
    destination = resolve_path(args.get("destination"))
    if not source.exists():
        raise ValueError(f"Source does not exist: {source}")
    if destination.exists():
        raise ValueError(f"Destination already exists: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if action == "copy":
        if source.is_dir():
            shutil.copytree(source, destination)
        else:
            shutil.copy2(source, destination)
    else:
        shutil.move(str(source), str(destination))
    return {"ok": True, action: {"from": str(source), "to": str(destination)}}


def file_control(args):
    action = args.get("action")
    if action == "find":
        return file_find(args)
    if action == "list":
        return file_list(args)
    if action == "read":
        return file_read(args)
    if action == "open":
        return file_open(args)
    if action in ("copy", "move", "rename"):
        return file_transfer(args, "copy" if action == "copy" else action)
    raise ValueError(f"Unsupported file action: {action}")


# Critical performance rule: discover Chrome HWNDs through Win32 first, then
# attach UIA only to those windows. Desktop-wide UIA enumeration was ~12 s on
# the reference machine and caused voice requests to cross a 15 s watchdog.
def chrome_windows():
    handles = []

    def callback(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd):
            return True
        try:
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            if (
                psutil.Process(pid).name().lower() == "chrome.exe"
                and win32gui.GetClassName(hwnd) == "Chrome_WidgetWin_1"
            ):
                handles.append(hwnd)
        except Exception:
            pass
        return True

    win32gui.EnumWindows(callback, None)
    return [Desktop(backend="uia").window(handle=hwnd) for hwnd in handles]


def clean_tab_title(title):
    return re.sub(r"\s+- Memory usage - [0-9.,]+ [KMG]B$", "", title or "").strip()


# Do not use every descendant TabItem. Web pages can expose page-level TabItems.
# The reference Chrome build exposed real browser tabs as class=Tab under a
# parent class=TabContainerImpl.
def chrome_tab_items(window):
    items = []
    for tab in window.descendants(control_type="TabItem"):
        try:
            parent = tab.parent()
            if tab.element_info.class_name == "Tab" and parent.element_info.class_name == "TabContainerImpl":
                items.append(tab)
        except Exception:
            continue
    return items


def browser_tabs():
    rows = []
    for window_index, window in enumerate(chrome_windows()):
        for tab_index, tab in enumerate(chrome_tab_items(window)):
            try:
                rows.append(
                    {
                        "window": window_index,
                        "index": tab_index,
                        "title": clean_tab_title(tab.window_text() or ""),
                        "selected": bool(tab.is_selected()),
                    }
                )
            except Exception:
                continue
    return rows


def find_tab(query):
    needle = str(query or "").strip().lower()
    tabs = browser_tabs()
    if needle in ("current", "active", "this", ""):
        match = next((item for item in tabs if item["selected"]), None)
    else:
        exact = next((item for item in tabs if item["title"].lower() == needle), None)
        match = exact or next((item for item in tabs if needle in item["title"].lower()), None)
        if not match and any(word in needle for word in ("github", "git hub", "repo", "repository")):
            match = next(
                (
                    item
                    for item in tabs
                    if "github" in item["title"].lower()
                    or re.match(r"^[\w.-]+/[\w.-]+(?::| ·|$)", item["title"])
                ),
                None,
            )
        if not match and "chatgpt" in needle:
            match = next(
                (item for item in tabs if "chatgpt" in item["title"].lower() or "avatar ethan" in item["title"].lower()),
                None,
            )
        if not match and "youtube" in needle:
            match = next((item for item in tabs if "youtube" in item["title"].lower()), None)
    if not match:
        raise ValueError(f"No Chrome tab matched: {query}")
    return match


def selected_tab(tabs=None):
    rows = tabs if tabs is not None else browser_tabs()
    return next((item for item in rows if item.get("selected")), None)


def wait_for_tabs(predicate, timeout=4.0):
    deadline = time.time() + timeout
    latest = browser_tabs()
    while time.time() < deadline:
        latest = browser_tabs()
        if predicate(latest):
            return latest
        time.sleep(0.12)
    return latest


def browser_control(args):
    action = args.get("action")
    if action == "list-tabs":
        return {"ok": True, "tabs": browser_tabs()}

    if action == "new-tab":
        before = browser_tabs()
        windows = chrome_windows()
        if not windows:
            raise ValueError("Chrome is not open.")
        windows[0].set_focus()
        send_keys("^t")
        after = wait_for_tabs(lambda rows: len(rows) > len(before))
        if len(after) <= len(before):
            raise ValueError("Chrome did not confirm that a new tab opened.")
        return {"ok": True, "verified": True, "action": "new-tab", "tab": selected_tab(after)}

    if action == "open-url":
        url = str(args.get("url") or "").strip()
        if not re.match(r"^https?://", url, re.I):
            raise ValueError("A complete http:// or https:// URL is required.")
        before = browser_tabs()
        before_active = selected_tab(before)
        before_title = (before_active or {}).get("title")
        os.startfile(url)
        after = wait_for_tabs(
            lambda rows: len(rows) > len(before)
            or (selected_tab(rows) is not None and selected_tab(rows).get("title") != before_title)
        )
        active = selected_tab(after)
        changed = len(after) > len(before) or (active is not None and active.get("title") != before_title)
        if not changed:
            raise ValueError("Chrome did not confirm that the requested page opened.")
        return {"ok": True, "verified": True, "action": "open-url", "opened": url, "tab": active}

    if action in ("next-tab", "previous-tab"):
        rows = browser_tabs()
        if len(rows) < 2:
            raise ValueError("Chrome does not have another browser tab to switch to.")
        current = next((i for i, item in enumerate(rows) if item.get("selected")), None)
        if current is None:
            raise ValueError("Chrome did not report an active browser tab.")
        step = 1 if action == "next-tab" else -1
        target = rows[(current + step) % len(rows)]
        args = {**args, "action": "switch-tab", "query": target["title"]}
        action = "switch-tab"

    if action in ("switch-tab", "close-tab"):
        match = find_tab(args.get("query"))
        windows = chrome_windows()
        window = windows[match["window"]]
        tabs = chrome_tab_items(window)
        tab = tabs[match["index"]]
        window.set_focus()
        tab.select()

        if action == "switch-tab":
            after = wait_for_tabs(
                lambda rows: bool(selected_tab(rows)) and selected_tab(rows).get("title") == match["title"],
                timeout=2.0,
            )
            active = selected_tab(after)
            if not active or active.get("title") != match["title"]:
                raise ValueError(f"Chrome did not confirm the switch to: {match['title']}")
            return {"ok": True, "verified": True, "action": "switch-tab", "tab": active}

        before_count = len(browser_tabs())
        time.sleep(0.08)
        send_keys("^w")
        # Re-enumerate. The old UIA tab object may already be invalid after Ctrl+W.
        after = wait_for_tabs(
            lambda rows: len(rows) < before_count or not any(item.get("title") == match["title"] for item in rows),
            timeout=2.0,
        )
        if len(after) >= before_count and any(item.get("title") == match["title"] for item in after):
            raise ValueError(f"Chrome did not confirm that the tab closed: {match['title']}")
        return {
            "ok": True,
            "verified": True,
            "action": "close-tab",
            "closed": match["title"],
            "tab": selected_tab(after),
        }

    raise ValueError(f"Unsupported browser action: {action}")


def visible_windows():
    rows = []

    def callback(hwnd, _):
        if not win32gui.IsWindowVisible(hwnd):
            return True
        title = win32gui.GetWindowText(hwnd).strip()
        if not title:
            return True
        try:
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            process = psutil.Process(pid).name()
        except Exception:
            pid, process = 0, ""
        rows.append({"hwnd": int(hwnd), "title": title, "process": process, "pid": pid})
        return True

    win32gui.EnumWindows(callback, None)
    return rows


def find_window(query):
    needle = str(query or "").strip().lower()
    windows = visible_windows()
    if not needle:
        raise ValueError("A window title or application name is required.")
    exact = next(
        (item for item in windows if item["title"].lower() == needle or item["process"].lower() == needle),
        None,
    )
    match = exact or next(
        (item for item in windows if needle in item["title"].lower() or needle in item["process"].lower()),
        None,
    )
    if not match:
        raise ValueError(f"No visible window matched: {query}")
    return match


def launch_app(name):
    value = str(name or "").strip()
    if not value:
        raise ValueError("An application name is required.")
    target = APP_ALIASES.get(value.lower(), value)
    path = Path(os.path.expandvars(os.path.expanduser(target)))
    if path.exists():
        os.startfile(str(path))
    else:
        resolved = shutil.which(target)
        if not resolved:
            raise ValueError(f"Application is not in the approved/available launch set: {value}")
        subprocess.Popen(
            [resolved],
            close_fds=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
        )
    return {"ok": True, "launched": value}


def window_control(args):
    action = args.get("action")
    if action == "list":
        return {"ok": True, "windows": visible_windows()[:80]}
    if action == "launch":
        return launch_app(args.get("app") or args.get("query"))
    match = find_window(args.get("query"))
    hwnd = match["hwnd"]
    if action == "focus":
        if win32gui.IsIconic(hwnd):
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        win32gui.SetForegroundWindow(hwnd)
    elif action == "minimize":
        win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
    elif action == "maximize":
        win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
    elif action == "restore":
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
    elif action == "close":
        win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
    else:
        raise ValueError(f"Unsupported window action: {action}")
    return {"ok": True, action: {"title": match["title"], "process": match["process"]}}


def main():
    if len(sys.argv) < 2:
        raise ValueError("Missing control request payload.")
    payload = sys.argv[1]
    if payload.startswith("b64:"):
        payload = base64.b64decode(payload[4:]).decode("utf-8")
    request = json.loads(payload)
    if not isinstance(request, dict):
        raise ValueError("Control request must be a JSON object.")
    domain = request.get("domain")
    if domain == "browser":
        result = browser_control(request)
    elif domain == "file":
        result = file_control(request)
    elif domain == "window":
        result = window_control(request)
    else:
        raise ValueError(f"Unsupported control domain: {domain}")
    emit(result)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        fail(exc)
