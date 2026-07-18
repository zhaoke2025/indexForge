type FeatureDimension = { id: string; value: unknown };

function injectBefore(html: string, marker: string, content: string) {
  return html.includes(marker) ? html.replace(marker, `${content}\n${marker}`) : html;
}

function hasClassElement(html: string, className: string) {
  return new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'i').test(html);
}

function userMenuHtml(html: string) {
  const bounds = findUserMenu(html);
  return bounds ? html.slice(bounds.start, bounds.closingEnd) : '';
}

function replaceUserMenu(html: string, replacement: string) {
  const bounds = findUserMenu(html);
  return bounds ? `${html.slice(0, bounds.start)}${replacement}${html.slice(bounds.closingEnd)}` : html;
}

function ensureUserMenu(html: string, userInfo: string, fallbackHtml: string) {
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
  const opening = /<div[^>]+class=(["'])[^"']*\buser-menu\b[^"']*\1[^>]*>/i.exec(html);
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
  const opening = new RegExp(`<([a-z][\\w-]*)[^>]+class=(["'])[^"']*\\b${className}\\b[^"']*\\2[^>]*>`, 'i').exec(html);
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
    const opening = html.slice(bounds.start, html.indexOf('>', bounds.start) + 1);
    const id = /\bid=(["'])([^"']+)\1/i.exec(opening)?.[2];
    if (id && !id.startsWith('indexForge')) ids.add(id);
  }
  return [...ids];
}

export function applyFunctionalDimensions(html: string, dimensions: FeatureDimension[], fallbackHtml = '') {
  const userInfo = dimensions.find((item) => item.id === 'userInfo')?.value;
  if (userInfo === '移除用户') {
    const bounds = findUserMenu(html);
    return bounds ? `${html.slice(0, bounds.start)}${html.slice(bounds.closingEnd)}` : html;
  }
  if (typeof userInfo !== 'string') return html;

  html = ensureUserMenu(html, userInfo, fallbackHtml);
  if (!findUserMenu(html)) return html;

  const showAvatar = userInfo.includes('头像');
  const showRole = userInfo.includes('角色');
  const showDropdown = userInfo.includes('下拉');
  const missingRequiredElement = !hasClassElement(html, 'user-name')
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
    if (!showRole) next = removeElementByClass(next, 'user-role');
    if (!hasClassElement(next, 'user-name')) {
      next += `<div class="user-meta"><span class="user-name">系统管理员</span>${showRole ? '<span class="user-role">管理员</span>' : ''}</div>`;
    } else if (showRole && !hasClassElement(next, 'user-role')) {
      next += '<span class="user-role">管理员</span>';
    }
    return next;
  });

  if (!showDropdown) return output;

  output = updateUserMenu(output, (content) => `${content}
                <button class="user-menu-trigger" id="indexForgeUserMenuTrigger" type="button" aria-label="打开用户菜单"><i class="fa fa-angle-down"></i></button>
                <div class="user-dropdown" id="indexForgeUserDropdown">
                    <button class="user-dropdown-item" type="button" data-user-action="change-password"><i class="fa fa-key"></i><span>修改密码</span></button>
                    <button class="user-dropdown-item danger" type="button" data-user-action="logout"><i class="fa fa-sign-out"></i><span>退出登录</span></button>
                </div>`);

  if (legacyIds.length) {
    const aliases = legacyIds.map((id) => `<button id="${id}" type="button" hidden></button>`).join('');
    output = injectBefore(output, '</body>', aliases);
  }

  if (!output.includes('/* IndexForge user dropdown */')) {
    output = injectBefore(output, '</head>', `<style>
        /* IndexForge user dropdown */
        .user-menu { position: relative; cursor: pointer; }
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
