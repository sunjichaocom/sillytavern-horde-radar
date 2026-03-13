import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// --- 1. 核心数据与缓存初始化 ---
const EXT_ID = 'hordeRadarApp';
if (!extension_settings[EXT_ID]) {
    extension_settings[EXT_ID] = { translations: {} };
}

let globalModelsData = [];

const BASE_PARAMS = {
    sdxl: { width: 832, height: 1216, sampler: "k_euler_a", steps: 30, scale: 7, clip_skip: 2, karras: false },
    sd15: { width: 512, height: 768, sampler: "k_dpmpp_2m", steps: 25, scale: 7, clip_skip: 2, karras: true }
};

// --- 新增：终极评分推断逻辑 (已剔除异常 queued 数据) ---
function calculateModelScore(m) {
    const perf = m.performance || 0;
    const count = m.count || 0;
    const eta = m.eta || 0;
    const jobs = m.jobs || 0; // 只依赖真实的任务数量

    // 1. 算力平滑
    const smoothPerf = Math.log10(perf + 10); 
    // 2. 空闲节点检测与红利
    const idleWorkers = Math.max(0, count - jobs); 
    const availabilityBonus = idleWorkers > 0 ? Math.sqrt(count) * 1.5 : Math.sqrt(count);
    // 3. 综合拥堵压力 (纯用 jobs 算压力)
    const realQueuePressure = jobs / (count + 0.1); 
    // 4. 时间非线性惩罚
    const penaltyETA = Math.pow(eta + 1, 1.2);

    return (smoothPerf * availabilityBonus * 100) / (penaltyETA + realQueuePressure * 0.5);
}

// --- 2. 智能分类与参数推导 ---
function analyzeModel(mName, baseline, style, rawDesc) {
    const n = (mName || "").toLowerCase();
    const b = (baseline || "").toLowerCase();
    const s = (style || "").toLowerCase();
    const d = (rawDesc || "").toLowerCase();

    let presetStyle = "SD 1.5 (纯写实/真人照)";
    let params = BASE_PARAMS.sd15;

    if (b.includes("pony") || n.includes("pony") || s.includes("pony")) {
        presetStyle = "Pony (动漫/R-18)";
        params = BASE_PARAMS.sdxl;
    } else if (b.includes("xl") || b.includes("sdxl")) {
        presetStyle = "SDXL (写实/通用)";
        params = BASE_PARAMS.sdxl;
    } else if (s.includes("anime") || s.includes("2.5d") || d.includes("anime") || d.includes("2.5d") || n.includes("mix") || n.includes("rev animated")) {
        presetStyle = "SD 1.5 (动漫/韩漫2.5D)";
    }

    let shortTags = [];
    if (d.includes("anime")) shortTags.push("二次元");
    if (d.includes("realistic") || d.includes("photoreal")) shortTags.push("写实");
    if (d.includes("2.5d") || d.includes("blend")) shortTags.push("2.5D");
    if (d.includes("hands")) shortTags.push("修手");
    if (d.includes("nsfw")) shortTags.push("NSFW优");
    const shortDesc = shortTags.length > 0 ? `偏向: ${shortTags.join(", ")}` : "综合风格";

    return { presetStyle, params, shortDesc };
}

// --- 3. UI 注入与构建 ---
jQuery(async () => {
    const uiHtml = `
        <div class="extension-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>AI Horde 全景生图指挥中心</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content" style="padding: 15px; background: #121212; color: #eee; border-radius: 8px;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                        <span id="horde-radar-status" style="font-size: 12px; color: #aaa;">等待拉取数据...</span>
                        <button id="btn-horde-refresh" class="menu_button" style="margin: 0; font-weight: bold;">📡 刷新雷达</button>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
                        ${buildSelectRow("all", "🏆 全体最优排序")}
                        ${buildSelectRow("pony", "🦄 Pony (动漫/R-18)")}
                        ${buildSelectRow("sdxl", "📸 SDXL (写实/通用)")}
                        ${buildSelectRow("sd15_anime", "🌸 SD 1.5 (动漫/韩漫)")}
                        ${buildSelectRow("sd15_real", "🎞️ SD 1.5 (纯写实)")}
                    </div>

                    <div id="horde-info-panel" style="display: none; background: #1e1e1e; border: 1px solid #444; border-radius: 8px; padding: 15px; font-size: 13px;">
                        </div>

                </div>
            </div>
        </div>
    `;

    $('#extensions_settings').append(uiHtml);
    
    // 绑定事件
    $('#btn-horde-refresh').on('click', fetchHordeData);
    $(document).on('click', '.btn-horde-sync', function() { syncToST($(this).data('target')); });
    $(document).on('click', '.btn-horde-info', function() { showInfoPanel($(this).data('target')); });
    
    // 绑定信息面板内部的直达同步按钮和刷新按钮事件
    $(document).on('click', '.btn-horde-sync-direct', function() { executeSync($(this).data('model')); });
    $(document).on('click', '.btn-horde-refresh-single', function() { refreshSingleModel($(this)); });

    fetchHordeData();
});

function buildSelectRow(id, label) {
    return `
        <div style="display: flex; gap: 8px; align-items: center;">
            <div style="width: 140px; font-size: 12px; font-weight: bold; color: #bb86fc; flex-shrink: 0;">${label}</div>
            <select id="horde-sel-${id}" style="flex: 1; background: #222; color: #eee; border: 1px solid #444; padding: 6px; border-radius: 4px;">
                <option value="">-- 等待雷达扫描 --</option>
            </select>
            <button class="menu_button btn-horde-sync" data-target="${id}" title="同步参数" style="margin:0; padding: 6px 10px;">⚙️同步</button>
            <button class="menu_button btn-horde-info" data-target="${id}" title="查看信息" style="margin:0; padding: 6px 10px;">ℹ️详情</button>
        </div>
    `;
}

// --- 4. 数据拉取与翻译引擎 ---
async function fetchHordeData() {
    $('#horde-radar-status').text('正在连接 AI Horde 与 GitHub...');
    $('#btn-horde-refresh').prop('disabled', true);

    try {
        const [statusRes, infoRes] = await Promise.all([
            fetch('https://aihorde.net/api/v2/status/models'),
            fetch('https://raw.githubusercontent.com/Haidra-Org/AI-Horde-image-model-reference/main/stable_diffusion.json')
        ]);

        const statusData = await statusRes.json();
        const infoDict = await infoRes.json();

        globalModelsData = [];

        statusData.forEach(m => {
            if (m.type === "image" && m.count > 0) {
                const info = infoDict[m.name] || {};
                const optimalScore = calculateModelScore(m); // 使用新算法
                const analysis = analyzeModel(m.name, info.baseline, info.style, info.description);

                globalModelsData.push({
                    name: m.name, workers: m.count, performance: Math.round(m.performance), eta: m.eta,
                    jobs: m.jobs, // 仅保留真实的排队数据
                    score: optimalScore, nsfw: info.nsfw === true, 
                    baseline: info.baseline || "未知", version: info.version || "未知", style: info.style || "综合",
                    rawDesc: info.description || "", showcases: info.showcases || [],
                    presetStyle: analysis.presetStyle, shortDesc: analysis.shortDesc,
                    params: analysis.params
                });
            }
        });

        globalModelsData.sort((a, b) => b.score - a.score);
        populateDropdowns();
        
        $('#horde-radar-status').text(`✅ 已拉取 ${globalModelsData.length} 个模型 | ${new Date().toLocaleTimeString('zh-CN', {hour12:false})}`);
        
        processTranslationsBackground();

    } catch (error) {
        $('#horde-radar-status').text('❌ 获取失败，请重试');
    } finally {
        $('#btn-horde-refresh').prop('disabled', false);
    }
}

function populateDropdowns() {
    const sels = {
        all: $('#horde-sel-all').empty().append('<option value="">-- 选择目标 --</option>'),
        pony: $('#horde-sel-pony').empty().append('<option value="">-- 选择目标 --</option>'),
        sdxl: $('#horde-sel-sdxl').empty().append('<option value="">-- 选择目标 --</option>'),
        sd15_anime: $('#horde-sel-sd15_anime').empty().append('<option value="">-- 选择目标 --</option>'),
        sd15_real: $('#horde-sel-sd15_real').empty().append('<option value="">-- 选择目标 --</option>')
    };

    globalModelsData.forEach(m => {
        const text = `${m.name} ${m.nsfw ? '🔞' : ''} (${m.workers}台)`;
        const opt = `<option value="${m.name}">${text}</option>`;
        
        sels.all.append(opt);
        if (m.presetStyle === "Pony (动漫/R-18)") sels.pony.append(opt);
        else if (m.presetStyle === "SDXL (写实/通用)") sels.sdxl.append(opt);
        else if (m.presetStyle === "SD 1.5 (动漫/韩漫2.5D)") sels.sd15_anime.append(opt);
        else if (m.presetStyle === "SD 1.5 (纯写实/真人照)") sels.sd15_real.append(opt);
    });
}

async function processTranslationsBackground() {
    let cacheUpdated = false;
    for (const m of globalModelsData) {
        if (!m.rawDesc) continue;
        const cache = extension_settings[EXT_ID].translations[m.name];
        
        if (!cache || cache.eng !== m.rawDesc) {
            try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(m.rawDesc)}`);
                const data = await res.json();
                const translatedText = data[0].map(item => item[0]).join('');
                
                extension_settings[EXT_ID].translations[m.name] = { eng: m.rawDesc, chn: translatedText };
                cacheUpdated = true;
            } catch (e) {
                console.log("翻译节流跳过", m.name);
            }
            await new Promise(r => setTimeout(r, 400));
        }
    }
    if (cacheUpdated) saveSettingsDebounced();
}

// --- 5. 信息面板展示 (优化了移动端折行与负荷数据显示) ---
function showInfoPanel(targetId) {
    const selName = $(`#horde-sel-${targetId}`).val();
    if (!selName) { toastr.warning("请先在左侧选择一个模型！"); return; }

    const m = globalModelsData.find(x => x.name === selName);
    const cache = extension_settings[EXT_ID].translations[m.name];
    const chnDesc = cache ? cache.chn : "（正在后台排队翻译中...可稍后重试）";

    let imgHtml = '';
    if (m.showcases.length > 0) {
        m.showcases.forEach(url => { imgHtml += `<img src="${url}" style="width:100%; border-radius:6px; margin-top:10px;">`; });
    } else {
        imgHtml = `<div style="text-align:center; padding:10px; color:#666; border:1px dashed #444; margin-top:10px;">暂无官方预览图</div>`;
    }

    // 算力格式化
    const perfText = m.performance > 1000 ? (m.performance/1000).toFixed(1) + 'k' : m.performance;
    const etaColor = m.eta === 0 ? 'var(--success)' : 'var(--danger)';

    const html = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-size: 16px; font-weight: bold; color: #bb86fc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${m.name} ${m.nsfw ? '<span style="color:#ff5252">🔞</span>' : ''}
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                <button class="menu_button btn-horde-refresh-single" data-model="${m.name}" style="margin: 0; padding: 6px 12px; font-weight: bold; border-radius: 6px;">🔄 刷新</button>
                <button class="menu_button btn-horde-sync-direct" data-model="${m.name}" style="margin: 0; padding: 6px 12px; font-weight: bold; border-radius: 6px;">⚙️ 直接同步</button>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
            <div style="background:#000; padding:6px 8px; border-radius:4px;">🎯 风格: <span style="color:#eee">${m.presetStyle}</span></div>
            <div style="background:#000; padding:6px 8px; border-radius:4px;">🏗️ 架构: <span style="color:#eee">${m.baseline} (v${m.version})</span></div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="background:#000; padding:6px 8px; border-radius:4px;">⚡ 算力: <span id="info-val-perf" style="color:#ffb74d; font-weight:bold;">${perfText}</span></div>
                <div style="background:#000; padding:6px 8px; border-radius:4px;">💻 主机: <span id="info-val-workers" style="color:var(--success); font-weight:bold;">${m.workers} 台</span></div>
                <div style="background:#000; padding:6px 8px; border-radius:4px;">⚙️ 负荷: <span id="info-val-jobs" style="color:#03dac6; font-weight:bold;">${m.jobs} 个任务</span></div>
                <div style="background:#000; padding:6px 8px; border-radius:4px;">⏱️ 预计: <span id="info-val-eta" style="color:${etaColor}; font-weight:bold;">${m.eta}s</span></div>
            </div>
            
            <div style="background:#111; border: 1px solid #333; padding:8px; border-radius:4px; text-align: center;">
                🏆 雷达综合评分: <span id="info-val-score" style="color:#bb86fc; font-size:16px; font-weight:bold;">${Math.round(m.score)}</span>
            </div>
        </div>

        <div style="background:#2a2a2a; border-left:3px solid #03dac6; padding:8px 10px; margin-bottom:15px; border-radius: 0 4px 4px 0;">
            <div style="color:#fff; font-weight:bold; margin-bottom:4px;">汉化简介:</div>
            <div style="color:#ccc; line-height: 1.5;">${chnDesc}</div>
            <div style="color:#666; font-size:11px; margin-top:6px; line-height:1.3;">[英文原文]: ${m.rawDesc || "无"}</div>
        </div>
        <div style="font-weight:bold; color:#bb86fc;">🖼️ 官方预览图:</div>
        ${imgHtml}
    `;

    $('#horde-info-panel').html(html).slideDown(200);
}

// 新增：局部刷新单个模型的实时状态
async function refreshSingleModel(btnObj) {
    const modelName = btnObj.data('model');
    if (!modelName) return;

    const originalText = btnObj.html();
    btnObj.html('⏳...').prop('disabled', true);

    try {
        const res = await fetch('https://aihorde.net/api/v2/status/models');
        const statusData = await res.json();
        const liveData = statusData.find(m => m.name === modelName);

        if (liveData) {
            const mInfo = globalModelsData.find(x => x.name === modelName);
            if (mInfo) {
                // 更新内存中的数据
                mInfo.workers = liveData.count;
                mInfo.performance = Math.round(liveData.performance);
                mInfo.eta = liveData.eta;
                mInfo.jobs = liveData.jobs;     // 仅同步真实任务数据
                mInfo.score = calculateModelScore(liveData); // 使用新算法重新计算分数

                // 局部更新 UI
                const perfText = mInfo.performance > 1000 ? (mInfo.performance/1000).toFixed(1) + 'k' : mInfo.performance;
                const etaColor = mInfo.eta === 0 ? 'var(--success)' : 'var(--danger)';

                $('#info-val-perf').text(perfText);
                $('#info-val-workers').text(mInfo.workers + ' 台');
                $('#info-val-jobs').text(`${mInfo.jobs} 个任务`);
                $('#info-val-eta').text(`${mInfo.eta}s`).css('color', etaColor);
                $('#info-val-score').text(Math.round(mInfo.score));
                
                toastr.success(`【${modelName}】实时参数已更新`);
            }
        } else {
            toastr.warning('该模型当前可能已无在线节点');
        }
    } catch (e) {
        toastr.error('实时状态刷新失败，请检查网络');
    } finally {
        btnObj.html(originalText).prop('disabled', false);
    }
}

// --- 6. 终极深度同步机制 ---
function syncToST(targetId) {
    const selName = $(`#horde-sel-${targetId}`).val();
    if (!selName) { toastr.warning("请先在左侧选择一个模型进行同步！"); return; }
    executeSync(selName);
}

// 核心执行逻辑被抽离出来，支持通过名字直接同步
function executeSync(selName) {
    const m = globalModelsData.find(x => x.name === selName);
    if (!m) return;
    const sd = extension_settings.sd;

    sd.model = m.name;
    $('#sd_model').val(m.name).trigger('change');

    const p = m.params;
    sd.width = p.width; $('#sd_width').val(p.width).trigger('input');
    sd.height = p.height; $('#sd_height').val(p.height).trigger('input');
    sd.sampler = p.sampler; $('#sd_sampler').val(p.sampler).trigger('change');
    sd.steps = p.steps; $('#sd_steps').val(p.steps).trigger('input');
    sd.scale = p.scale; $('#sd_scale').val(p.scale).trigger('input');
    sd.clip_skip = p.clip_skip; $('#sd_clip_skip').val(p.clip_skip).trigger('input');
    sd.horde_karras = p.karras; $('#sd_horde_karras').prop('checked', p.karras).trigger('change');

    $('#sd_resolution').val(`${p.width}x${p.height}`).trigger('change');

    const targetStyle = m.presetStyle;
    const styleObj = sd.styles.find(s => s.name === targetStyle);
    
    if (styleObj) {
        sd.style = targetStyle;
        sd.prompt_prefix = styleObj.prefix;
        sd.negative_prompt = styleObj.negative;

        $('#sd_style').val(targetStyle).trigger('change');
        $('#sd_prompt_prefix').val(styleObj.prefix).trigger('input');
        $('#sd_negative_prompt').val(styleObj.negative).trigger('input');
    } else {
        toastr.error(`在 ST 的风格预设中找不到【${targetStyle}】！请先在画图面板创建该风格。`, "同步警告");
    }

    saveSettingsDebounced();
    toastr.success(`全套参数已注入！\n模型: ${m.name}\n风格: ${targetStyle}`, 'AI Horde 终极同步', {timeOut: 3000});
}