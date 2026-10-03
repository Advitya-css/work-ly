/**
 * The inline script that applies the saved colour theme before first paint
 * (no flash of the wrong theme). It lives here, not in the layout, because
 * the Content-Security-Policy in proxy.ts allows it by its SHA-256 hash.
 * That way the root layout no longer has to read a per-request nonce, which
 * is what made every page - even static ones like Pricing - render on each
 * request instead of being cached.
 *
 * If you edit THEME_SCRIPT, update THEME_SCRIPT_HASH too: tests/theme-script.test.ts
 * fails until they match, and prints the new hash.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem('theme'),c=['dark','theme-midnight','theme-lavender','theme-rose','theme-sunset'],m={dark:['dark'],midnight:['dark','theme-midnight'],lavender:['theme-lavender'],rose:['theme-rose'],sunset:['dark','theme-sunset']};c.forEach(function(x){d.classList.remove(x)});if(t&&m[t]){m[t].forEach(function(x){d.classList.add(x)})}else if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}}catch(e){}})()`;

export const THEME_SCRIPT_HASH = "sha256-LlhHp5R+ySpVmwfJFk92GoVg0ZDIENvgjaeLRP2FBcM=";
