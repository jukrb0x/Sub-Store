import $ from '@/core/app';
export const statusKey = key => `#sub-store-refresh-status-${key}`;
export function readRefreshStatus(key) {
    try { const raw = $.read(statusKey(key)); return typeof raw === 'string' ? JSON.parse(raw) : raw || {}; } catch (_) { return {}; }
}
export function describeRefreshStatus(s) {
    const time = n => n ? new Date(n).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}) : '未记录';
    const outcome = {pending:'请求中',success:'远程成功',failed:'远程失败'}[s.lastAttemptResult] || '尚未尝试';
    return `Remote: ${outcome}${s.lastError ? ` (${s.lastError})` : ''}\n最近尝试: ${time(s.lastAttemptAt)}\n最后成功: ${time(s.lastSuccessAt)}\n本次旧缓存: ${s.usedOldCache == null ? '未知' : s.usedOldCache ? '是' : '否'}${s.delivery === 'memory' ? '（普通缓存，未再次请求）' : ''}`;
}
export function writeRefreshStatus(key, patch, notify = false) {
    const state = {...readRefreshStatus(key), ...patch, version:1};
    $.write(JSON.stringify(state),statusKey(key));
    if (notify) { try { $.notify('Subscription refresh',state.lastAttemptResult === 'success' ? '✅ Remote success' : state.usedOldCache ? '⚠️ Remote failed · cached nodes' : '❌ Remote failed',describeRefreshStatus(state)); } catch (_) {} }
    return state;
}
export function safeRefreshError(error) {
    const text = String(error?.message ?? error);
    const code = text.match(/statusCode:\s*(\d{3})/);
    return code ? `HTTP ${code[1]}` : /timeout|超时/i.test(text) ? 'TIMEOUT' : /invalid|不包含有效节点|为空|empty/i.test(text) ? 'INVALID_CONTENT' : 'NETWORK_ERROR';
}
export function trackedSubscription(sub) {
    const args=(sub.url||'').split('#')[1]||'';
    const key=args.match(/(?:^|&)cacheKey=([^&]+)/)?.[1];
    if (!key || !/(?:^|&)trackStatus=true(?:&|$)/.test(args)) return sub;
    const refreshStatus=readRefreshStatus(decodeURIComponent(key));
    return {...sub,refreshStatus,refreshStatusText:describeRefreshStatus(refreshStatus),remark:describeRefreshStatus(refreshStatus)};
}
