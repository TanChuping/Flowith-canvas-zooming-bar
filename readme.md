# Flowith JoyStick Zoom 🚀

[![Version](https://img.shields.io/badge/version-1.0.0-blueviolet)](https://flowith.io)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/licenses/MIT)

**Flowith JoyStick Zoom** 是一款专为 [Flowith.io](https://flowith.io) 深度定制的画布交互增强扩展。它彻底改变了原生繁琐的点击缩放模式，引入了专业级软件的“双轨控制系统”：一个用于宏观定位的绝对进度条，以及一个用于微调的竖向摇杆。

---

## ✨ 核心特性 / Key Features

### 1. 双轨缩放系统 (Dual-Track Control)
- **底部横条 (Absolute Slider):** “指哪打哪”的全局定位。圆点位置实时反映当前缩放比例，点击或拖拽即可瞬间切换视图。
- **右侧竖条 (Joystick Slider):** 弹性摇杆体验。向上推持续放大，向下推持续缩小，松手自动回弹复位，极适合精细操作。

### 2. 智能视觉反馈 (Dynamic Visuals)
- **呼吸圆点 (Breathing Thumb):** 底部圆点的大小会随着缩放比例动态微调（12px - 24px），在视觉上直观感受身处宏观还是微观。
- **双向同步 (Bi-directional Sync):** 无论使用鼠标滚轮、键盘快捷键还是插件滑块，所有 UI 状态实时同步，永不脱节。

### 3. 高级美学设计 (Premium UI)
- **高级紫色调:** 采用 `rgb(110, 113, 242)` 核心点缀色。
- **毛玻璃特效:** 极致通透的背景模糊处理，完美适配 Flowith 暗黑模式。

---

## 🔒 隐私政策 / Privacy Policy

本项目高度重视用户隐私。根据 Chrome Web Store 的开发者政策，特此声明：

### 1. 数据收集 (Data Collection)
- **零收集:** 本扩展程序**不会**收集、存储或传输任何个人身份信息、浏览记录或用户数据。
- **本地运行:** 所有代码逻辑均在用户的浏览器本地执行，不与任何远程服务器通信。

### 2. 权限使用 (Permissions)
- **主机权限 (flowith.io):** 权限仅用于在画布界面注入 UI 元素并模拟缩放事件（Dispatch Wheel Events），以实现插件核心功能。
- **非侵入式:** 插件仅读取非敏感的缩放百分比文字用于 UI 同步，不会读取用户的对话内容或隐私文件。

### 3. 第三方披露 (Third-party Disclosure)
- 我们不会向任何第三方出售、交换或转让用户数据。

---

## 🛠️ 安装与开发 / Installation & Development

1. 下载本项目代码。
2. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)。
3. 开启“开发者模式”。
4. 选择“加载已解压的扩展程序”，选中本项目文件夹。


本项目即将上架谷歌extension商店 敬请期待

---

## 📜 许可证 / License

本项目基于 **MIT License** 开源。

---
