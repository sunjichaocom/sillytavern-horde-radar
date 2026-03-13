# AI Horde 全景生图指挥中心 📡 (Horde Radar App)

**简体中文** | [English](README.md)

[![SillyTavern Extension](https://img.shields.io/badge/SillyTavern-Extension-blue?style=for-the-badge&logo=github)](https://github.com/SillyTavern/SillyTavern) [![AI Horde Supported](https://img.shields.io/badge/AI%20Horde-Supported-orange?style=for-the-badge)](https://aihorde.net/)

> **致谢**: 感谢 [AI Horde](https://aihorde.net/) 提供的强大分布式生图网络，以及 [Haidra-Org](https://github.com/Haidra-Org) 维护的模型参考数据库。

一款专为 [SillyTavern](https://github.com/SillyTavern/SillyTavern) 设计的高级扩展插件。还在为 AI Horde 里成百上千个模型挑花了眼而烦恼吗？不知道哪个模型该用什么分辨率？受够了每次都要手动抄写一堆长串的模型参数？**AI Horde 全景生图指挥中心** 帮你把这些苦差事全包了！

---

## ✨ 核心雷达特性

* **🏆 独家多维智能评分**: 不再只看排队人数！内置终极评分推断逻辑，综合评估「算力平滑度」、「空闲节点红利」、「真实拥堵压力」与「预计耗时(ETA)惩罚」，帮你揪出当前最快、最好用的节点。
* **🧠 智能分类与参数推导**: 自动抓取模型基底与风格标签，将模型归类为 `Pony`、`SDXL`、`SD 1.5 动漫` 和 `SD 1.5 写实` 四大专区。并自动匹配与之对应的最佳分辨率 (如 832x1216)、采样器、步数与 CFG。
* **⚙️ 一键终极深度同步**: 这是本插件的核心魔法。一键将所有推导好的硬核参数直接注入 ST 原生画图面板，并联动你的“风格预设”自动填入正负面魔法词。
* **🌐 描述文本自动汉化**: 后台静默调用翻译接口，对官方海量的英文模型描述进行节流防封的自动汉化，并提供本地缓存，打造纯中文的选图体验。
* **📊 沉浸式情报面板**: 提供全方位的算力监控、在线主机数、真实负荷状态，并内嵌官方画廊预览图，支持针对单个模型的实时状态刷新。

---

## 📥 安装说明

1. 启动并打开 **[SillyTavern](https://github.com/SillyTavern/SillyTavern)**。
2. 点击顶部的 **扩展 (Extensions)** 菜单（积木图标）。
3. 展开并选择 **"安装扩展 (Install extension)"**。
4. 粘贴本仓库的链接：

       https://github.com/sunjichaocom/sillytavern-horde-radar

5. 点击 **安装 (Install)**。

> [!Warning]
> 请确保您已经在 ST 的画图设置中配置好了 AI Horde 的 API 密钥

---

## 🚀 使用指南与工作流

打开 ST 的扩展菜单，找到 **AI Horde 全景生图指挥中心** 面板。按照以下直观的步骤操作：

### 1. 刷新雷达与分类检索
点击 **刷新雷达** 拉取最新在线数据。下拉菜单已为您准备好了全局最优排序，以及针对各个垂直领域的精选模型列表。
<br>
<img src="assets/SettingsMain.png" width="400" alt="主控面板"> &nbsp; <img src="assets/SettingsItems.png" width="250" alt="下拉列表">

### 2. 查看情报与画廊预览
在下拉框选中感兴趣的模型后，点击 **详情**。即可展开该模型的沉浸式情报面板，查看它的实时算力、汉化简介以及官方提供的生成预览图。
<br>
<img src="assets/SettingsDetailsA.png" width="350" alt="详情展示A"> &nbsp; <img src="assets/SettingsDetailsB.png" width="350" alt="详情展示B">

### 3. 一键终极深度同步 (Deep Sync)
挑选完毕后，点击 **直接同步**（或列表旁的 **同步** 按钮）。
雷达会瞬间将该模型的名称、最佳分辨率、步数、采样器等参数，精确无误地**注入到左侧的原生图像生成面板**中，并自动切换对应的提示词风格！
<br>
<img src="assets/ScreenOperation.png" width="800" alt="同步操作演示">

---

## 🎨 推荐风格预设 (Style Presets)

为了让“一键同步”发挥最大威力（自动联动并填入正负面提示词），**强烈建议**在 ST 的 `图像生成 -> 风格` 面板中新建以下四个同名风格：

> [!Warning]
> 风格名称不带Emoji表情符号

> [!NOTE]
> 您可以完全使用自己习惯的专属提示词，以下为推荐的基础起手式：

<details>
<summary>🦄 <b>Pony (动漫/R-18)</b></summary>
<br>

* 🦄 **风格名称 (Style Name)**: 
  `Pony (动漫/R-18)`
* 🟢 **正向提示词 (Positive)**: 
  `score_9, score_8_up, score_7_up, source_anime, masterpiece, best quality, ultra detailed`
* 🔴 **负向提示词 (Negative)**: 
  `score_4, score_5, score_6, source_pony, source_furry, source_cartoon, monochrome, 3d, realistic, bad anatomy, bad hands, missing fingers`
</details>

<details>
<summary>📸 <b>SDXL (写实/通用)</b></summary>
<br>

* 📸 **风格名称 (Style Name)**: 
  `SDXL (写实/通用)`
* 🟢 **正向提示词 (Positive)**: 
  `masterpiece, best quality, ultra high res, photorealistic, 8k resolution, highly detailed`
* 🔴 **负向提示词 (Negative)**: 
  `(worst quality, low quality:1.4), bad anatomy, watermark, text, signature, ugly, deformed`
</details>

<details>
<summary>🌸 <b>SD 1.5 (动漫/韩漫2.5D)</b></summary>
<br>

* 🌸 **风格名称 (Style Name)**: 
  `SD 1.5 (动漫/韩漫2.5D)`
* 🟢 **正向提示词 (Positive)**: 
  `masterpiece, best quality, highly detailed, realistic anime style, 2.5d, photorealistic lighting`
* 🔴 **负向提示词 (Negative)**: 
  `(worst quality, low quality:1.4), bad anatomy, extra digits, signature, watermark, EasyNegative`
</details>

<details>
<summary>🎞️ <b>SD 1.5 (纯写实/真人照)</b></summary>
<br>

* 🎞️ **风格名称 (Style Name)**: 
  `SD 1.5 (纯写实/真人照)`
* 🟢 **正向提示词 (Positive)**: 
  `RAW photo, masterpiece, best quality, ultra-detailed, realistic, photorealistic, 8k uhd, dslr, soft lighting, film grain`
* 🔴 **负向提示词 (Negative)**: 
  `(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), (worst quality, low quality:1.4), (deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, mutated hands, ugly`
</details>

---

## 📜 鸣谢与开源协议

* UI 与核心架构设计：**Sun**
* 采用 **[MIT](LICENSE)** 协议开源。