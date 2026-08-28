import { countVisibleLogoutControls } from './html-validator.js';

type FeatureDimension = { id: string; value: unknown };

function injectBefore(html: string, marker: string, content: string) {
  return html.includes(marker) ? html.replace(marker, `${content}\n${marker}`) : html;
}

function injectAfterBody(html: string, content: string) {
  return html.replace(/<body\b[^>]*>/i, (body) => `${body}\n${content}`);
}

function findOpeningElementByClass(html: string, className: string, tagName?: string) {
  const pattern = /<([a-z][\w-]*)\b[^>]*\s+class\s*=\s*(["'])([^"']*)\2[^>]*>/ig;
  for (let opening = pattern.exec(html); opening; opening = pattern.exec(html)) {
    if (tagName && opening[1].toLowerCase() !== tagName.toLowerCase()) continue;
    if (opening[3].split(/\s+/).includes(className)) return opening;
  }
  return null;
}

function hasClassElement(html: string, className: string) {
  return Boolean(findOpeningElementByClass(html, className));
}

function addClassToElement(html: string, existingClass: string, addedClass: string) {
  const opening = findOpeningElementByClass(html, existingClass);
  if (!opening || opening.index === undefined || opening[3].split(/\s+/).includes(addedClass)) return html;
  const updated = opening[0].replace(
    /(\s+class\s*=\s*)(["'])([^"']*)\2/i,
    (_attribute, prefix: string, quote: string, classNames: string) => `${prefix}${quote}${classNames} ${addedClass}${quote}`,
  );
  return `${html.slice(0, opening.index)}${updated}${html.slice(opening.index + opening[0].length)}`;
}

function userMenuHtml(html: string) {
  const bounds = findUserMenu(html);
  return bounds ? html.slice(bounds.start, bounds.closingEnd) : '';
}

function replaceUserMenu(html: string, replacement: string) {
  const bounds = findUserMenu(html);
  return bounds ? `${html.slice(0, bounds.start)}${replacement}${html.slice(bounds.closingEnd)}` : html;
}

export function ensureUserMenuClass(html: string) {
  return addClassToElement(html, 'user-menu-wrapper', 'user-menu');
}

function ensureUserMenu(html: string, userInfo: string, fallbackHtml: string) {
  html = ensureUserMenuClass(html);
  if (findUserMenu(html)) return html;
  const fallbackUserMenu = userMenuHtml(fallbackHtml);
  if (fallbackUserMenu) return html.replace(/<\/header>/i, `${fallbackUserMenu}\n        </header>`);
  const avatar = userInfo.includes('头像') ? '<div class="avatar-circle"><i class="fa fa-user-o"></i></div>' : '';
  const role = userInfo.includes('角色') ? '<span class="user-role">管理员</span>' : '';
  const userMenu = `<div class="user-menu">
                ${avatar}
                <div class="user-meta">
                    <span class="user-name">系统管理员</span>
                    ${role}
                </div>
            </div>`;
  return html.replace(/<\/header>/i, `${userMenu}\n        </header>`);
}

function findUserMenu(html: string) {
  const opening = findOpeningElementByClass(html, 'user-menu', 'div');
  if (!opening || opening.index === undefined) return null;
  const start = opening.index;
  const contentStart = start + opening[0].length;
  const tagPattern = /<\/?div\b[^>]*>/ig;
  tagPattern.lastIndex = contentStart;
  let depth = 1;
  let closingStart = -1;
  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    depth += /^<div\b/i.test(match[0]) ? 1 : -1;
    if (depth === 0) {
      closingStart = match.index;
      break;
    }
  }
  if (closingStart < 0) return null;
  return { start, contentStart, closingStart, closingEnd: tagPattern.lastIndex };
}

function updateUserMenu(html: string, update: (content: string) => string) {
  const bounds = findUserMenu(html);
  if (!bounds) return html;
  return `${html.slice(0, bounds.contentStart)}${update(html.slice(bounds.contentStart, bounds.closingStart))}${html.slice(bounds.closingStart)}`;
}

function findElementByClass(html: string, className: string) {
  const opening = findOpeningElementByClass(html, className);
  if (!opening || opening.index === undefined) return null;
  const tagName = opening[1];
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'ig');
  tagPattern.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    depth += new RegExp(`^<${tagName}\\b`, 'i').test(match[0]) ? 1 : -1;
    if (depth === 0) return { start: opening.index, end: tagPattern.lastIndex };
  }
  return null;
}

function removeElementByClass(content: string, className: string) {
  let output = content;
  for (let bounds = findElementByClass(output, className); bounds; bounds = findElementByClass(output, className)) {
    output = `${output.slice(0, bounds.start)}${output.slice(bounds.end)}`;
  }
  return output;
}

function removeElementById(content: string, id: string) {
  const opening = new RegExp(`<([a-z][\\w-]*)[^>]+id=(["'])${id}\\2[^>]*>`, 'i').exec(content);
  if (!opening || opening.index === undefined) return content;
  const tagName = opening[1];
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'ig');
  tagPattern.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  for (let match = tagPattern.exec(content); match; match = tagPattern.exec(content)) {
    depth += new RegExp(`^<${tagName}\\b`, 'i').test(match[0]) ? 1 : -1;
    if (depth === 0) return `${content.slice(0, opening.index)}${content.slice(tagPattern.lastIndex)}`;
  }
  return content;
}

function removeUserDropdown(content: string) {
  return removeElementByClass(
    removeElementByClass(
      removeElementByClass(content, 'user-menu-trigger'),
      'user-menu-arrow',
    ).replace(/<i class="fa fa-(?:angle-down|chevron-down|caret-down)[^"]*"[^>]*><\/i>/gi, ''),
    'user-dropdown',
  );
}

function legacyUserDropdownIds(html: string) {
  const ids = new Set<string>();
  for (const className of ['user-menu-trigger', 'user-menu-arrow', 'user-dropdown']) {
    const bounds = findElementByClass(html, className);
    if (!bounds) continue;
    const element = html.slice(bounds.start, bounds.end);
    for (const match of element.matchAll(/\bid=(["'])([^"']+)\1/gi)) {
      if (!match[2].startsWith('indexForge')) ids.add(match[2]);
    }
  }
  return [...ids];
}

function ensureDirectLogoutBehavior(html: string) {
  let output = html;
  if (!output.includes('/* IndexForge direct logout */')) {
    output = injectBefore(output, '</head>', `<style>
        /* IndexForge direct logout */
        .indexforge-logout-button {
            display: inline-flex; align-items: center; justify-content: center; gap: 6px;
            min-height: 34px; padding: 0 10px; border: 0; border-radius: 6px;
            color: #64748B; background: transparent; cursor: pointer;
        }
        .indexforge-logout-button:hover { color: #475569; background: #F1F5F9; }
    </style>`);
  }
  if (!output.includes('function bindIndexForgeLogoutButton') && !/getElementById\(\s*['"]logoutBtn['"]\s*\)\s*\.addEventListener/i.test(output)) {
    output = injectBefore(output, '</body>', `<script>
        function bindIndexForgeLogoutButton() {
            const logoutButton = document.getElementById('logoutBtn');
            if (!logoutButton) return;
            logoutButton.addEventListener('click', function() {
                const redirectToLogin = function() { window.location.href = 'login.html'; };
                if (typeof window.showConfirm === 'function') {
                    Promise.resolve(window.showConfirm('退出系统', '确定要退出登录吗？', '确定', '取消')).then(function(result) {
                        if (result) redirectToLogin();
                    });
                    return;
                }
                if (window.confirm('确定要退出登录吗？')) redirectToLogin();
            });
        }
        bindIndexForgeLogoutButton();
    </script>`);
  }
  return output;
}

export function ensureReferencedElementAliases(html: string) {
  const aliasIds = new Set<string>();
  const withoutAliases = html.replace(/<button\s+id=(["'])([A-Za-z][\w:.-]*)\1\s+type=(["'])button\3\s+hidden><\/button>\s*/gi, (_element, _quote, id: string) => {
    aliasIds.add(id);
    return '';
  });
  const existingIds = new Set([...withoutAliases.matchAll(/\bid=(["'])([A-Za-z][\w:.-]*)\1/gi)].map((match) => match[2]));
  for (const match of withoutAliases.matchAll(/document\.getElementById\(\s*(["'])([A-Za-z][\w:.-]*)\1\s*\)/gi)) {
    if (!existingIds.has(match[2])) aliasIds.add(match[2]);
  }
  if (!aliasIds.size) return withoutAliases;
  const aliases = [...aliasIds].map((id) => `<button id="${id}" type="button" hidden></button>`).join('');
  return injectAfterBody(withoutAliases, aliases);
}

export function ensureSidebarToggleAccessible(html: string) {
  if (!/\bid=(["'])sidebarToggleBtn\1/i.test(html)) return html;

  const marker = 'indexforge-sidebar-toggle-container';
  const marked = html.replace(
    /<([a-z][\w:-]*)\b([^>]*)>\s*(?=<button\b[^>]*\bid=(["'])sidebarToggleBtn\3)/i,
    (opening, tag: string, attributes: string) => {
      if (new RegExp(`\\b${marker}\\b`).test(attributes)) return opening;
      if (/\bclass=(["'])([^"']*)\1/i.test(attributes)) {
        return opening.replace(/\bclass=(["'])([^"']*)\1/i, (_className: string, quote: string, classes: string) => `class=${quote}${classes} ${marker}${quote}`);
      }
      return opening.replace(`<${tag}`, `<${tag} class="${marker}"`);
    },
  );
  if (marked === html || marked.includes('/* IndexForge sidebar toggle accessibility */')) return marked;

  return injectBefore(marked, '</head>', `<style>
        /* IndexForge sidebar toggle accessibility */
        .app-sidebar.sidebar-collapsed .${marker} { display: flex !important; }
    </style>`);
}

export function applyFunctionalDimensions(html: string, dimensions: FeatureDimension[], fallbackHtml = '') {
  const userInfo = dimensions.find((item) => item.id === 'userInfo')?.value;
  const logout = dimensions.find((item) => item.id === 'logout')?.value;
  if (userInfo === '移除用户') {
    const bounds = findUserMenu(html);
    const withoutUser = bounds ? `${html.slice(0, bounds.start)}${html.slice(bounds.closingEnd)}` : html;
    const withLogout = withoutUser.replace(/<\/header>/i, '<button class="btn-logout indexforge-logout-button" id="logoutBtn" type="button"><i class="fa fa-sign-out"></i><span>退出登录</span></button>\n        </header>');
    return ensureDirectLogoutBehavior(withLogout);
  }
  if (typeof userInfo !== 'string') return html;

  html = ensureUserMenu(html, userInfo, fallbackHtml);
  if (!findUserMenu(html)) return html;

  const showAvatar = userInfo.includes('头像');
  const showName = userInfo.includes('姓名') || userInfo.includes('用户名');
  const showRole = userInfo.includes('角色');
  const explicitlyNoDropdown = userInfo.includes('无下拉');
  const logoutInDropdown = typeof logout === 'string' && logout.includes('下拉菜单');
  const logoutOutsideDropdown = typeof logout === 'string' && /头像右侧|顶栏最右侧|侧边栏最底部|单独/.test(logout);
  const showDropdown = !explicitlyNoDropdown && (userInfo.includes('下拉') || logoutInDropdown);
  const showDirectLogout = !showDropdown || logoutOutsideDropdown;
  const missingRequiredElement = (showName && !hasClassElement(html, 'user-name'))
    || (showAvatar && !hasClassElement(html, 'avatar-circle'))
    || (showRole && !hasClassElement(html, 'user-role'));
  const fallbackUserMenu = userMenuHtml(fallbackHtml);
  if (missingRequiredElement && fallbackUserMenu) html = replaceUserMenu(html, fallbackUserMenu);
  const legacyIds = legacyUserDropdownIds(html);
  let output = updateUserMenu(html, (content) => {
    let next = removeUserDropdown(content);
    if (!showAvatar) next = removeElementByClass(next, 'avatar-circle');
    if (showAvatar && !hasClassElement(next, 'avatar-circle')) {
      next = `<div class="avatar-circle"><i class="fa fa-user-o"></i></div>${next}`;
    }
    if (!showName && !showRole) {
      next = removeElementByClass(next, 'user-meta');
    } else if (!showName) {
      next = removeElementByClass(next, 'user-name');
    }
    if (!showRole) next = removeElementByClass(next, 'user-role');
    if (showName && !hasClassElement(next, 'user-name')) {
      next += `<div class="user-meta"><span class="user-name">系统管理员</span>${showRole ? '<span class="user-role">管理员</span>' : ''}</div>`;
    } else if (showRole && !hasClassElement(next, 'user-role')) {
      next += '<span class="user-role">管理员</span>';
    }
    if (showDropdown || showDirectLogout) {
      next = removeElementByClass(removeElementById(next, 'logoutBtn'), 'btn-logout');
    }
    if (showDirectLogout && countVisibleLogoutControls(next) === 0) {
      next += '<button class="btn-logout indexforge-logout-button" id="logoutBtn" type="button"><i class="fa fa-sign-out"></i><span>退出登录</span></button>';
    }
    return next;
  });

  if (showDirectLogout && /\bid=(["'])logoutBtn\1/i.test(output)) output = ensureDirectLogoutBehavior(output);

  if (!showDropdown) return output;

  output = updateUserMenu(output, (content) => `${content}
                <button class="user-menu-trigger" id="indexForgeUserMenuTrigger" type="button" aria-label="打开用户菜单"><i class="fa fa-angle-down"></i></button>
                <div class="user-dropdown" id="indexForgeUserDropdown">
                    <button class="user-dropdown-item" type="button" data-user-action="change-password"><i class="fa fa-key"></i><span>修改密码</span></button>
                    ${showDirectLogout ? '' : '<button class="user-dropdown-item danger" type="button" data-user-action="logout"><i class="fa fa-sign-out"></i><span>退出登录</span></button>'}
                </div>`);

  if (legacyIds.length) {
    const aliases = legacyIds.map((id) => `<button id="${id}" type="button" hidden></button>`).join('');
    output = injectAfterBody(output, aliases);
  }

  if (!output.includes('/* IndexForge user dropdown */')) {
    output = injectBefore(output, '</head>', `<style>
        /* IndexForge user dropdown */
        .user-menu {
            position: relative; display: flex; flex-direction: row; flex-wrap: nowrap;
            align-items: center; cursor: pointer;
        }
        .user-menu-trigger {
            display: inline-flex; align-items: center; justify-content: center;
            width: 26px; height: 26px; padding: 0; border: 0;
            color: inherit; background: transparent; cursor: pointer;
        }
        .user-dropdown {
            position: absolute; z-index: 100; top: calc(100% + 10px); right: 0;
            display: none; min-width: 150px; padding: 6px;
            border: 1px solid #E2E8F0; border-radius: 8px;
            color: #0F172A; background: #FFFFFF;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
        }
        .user-dropdown.open { display: block; }
        .user-dropdown-item {
            display: flex; align-items: center; gap: 8px; width: 100%;
            min-height: 34px; padding: 0 10px; border: 0; border-radius: 6px;
            color: inherit; background: transparent; cursor: pointer; text-align: left;
        }
        .user-dropdown-item:hover { background: #F1F5F9; }
        .user-dropdown-item.danger { color: #DC2626; }
    </style>`);
  }

  if (!output.includes('function bindIndexForgeUserDropdown')) {
    output = injectBefore(output, '</body>', `<script>
        function bindIndexForgeUserDropdown() {
            const userMenu = document.querySelector('.user-menu');
            const trigger = document.getElementById('indexForgeUserMenuTrigger');
            const userDropdown = document.getElementById('indexForgeUserDropdown');
            if (!userMenu || !trigger || !userDropdown) return;
            trigger.addEventListener('click', function(event) {
                event.stopPropagation();
                userDropdown.classList.toggle('open');
            });
            userMenu.addEventListener('click', function(event) {
                if (event.target.closest('.user-dropdown-item')) return;
                if (event.target.closest('#indexForgeUserMenuTrigger')) return;
                event.stopPropagation();
                userDropdown.classList.toggle('open');
            });
            document.addEventListener('click', function() {
                userDropdown.classList.remove('open');
            });
        }
        bindIndexForgeUserDropdown();
    </script>`);
  }

  return output;
}
