# 技术架构文档 (arch.md) - 树洞自律小刺猬 Web 1.0

## 1. 技术栈选型
为了保证项目的极端轻量化、高加载速度，以及对 AI 友好度，不使用任何前端框架（如 React/Vue），采用纯原生技术流：
* **HTML5**: 负责结构、多媒体标签（`<video>`, `<audio>`）控制。
* **CSS3**: 负责界面手绘风布局、全局响应式、全屏高斯模糊（毛玻璃）特效、淡入淡出动画。
* **Vanilla JavaScript (ES6+)**: 负责状态机切换、倒计时引擎、本地缓存（LocalStorage）管理。

---

## 2. 目录结构规范
项目内所有资源和文件的存放必须严格遵守以下目录树，AI 在编写路径时禁止自作主张：

```text
my-project/
├── assets/                    
│   ├── images/                
│   │   ├── bg-mailbox-page.jpg # 信箱页大木板底图
│   │   ├── btn-back.png       # 返回首页箭头
│   │   ├── btn-start.png      # 爪子木桩启动按钮
│   │   ├── icon-close.png     # 木质X关闭图标
│   │   ├── icon-mailbox.png   # 首页草地邮箱
│   │   ├── panel-stats.png    # 空白统计看板
│   │   ├── paper-texture.png  # 空白手写信羊皮纸
│   │   ├── poster-home.jpg    # 首页视频加载前垫底图
│   │   └── poster-zen.jpg     # 专注页视频加载前垫底图
│   ├── audio/                 
│   │   ├── click.mp3          # 按钮点击音效 (25%音量)
│   │   ├── home-bgm.mp3       # 首页与信箱页常驻BGM (25%音量)
│   │   └── zen-bgm.mp3        # 专注页沉浸式BGM (25%音量)
│   └── videos/                
│       ├── go-home.mp4        # 成功通关进屋视频（带原声BGM，25%音量）
│       ├── home-bg.mp4        # 首页常驻动态背景（循环）
│       ├── running-loop.mp4   # 专注禅定奔跑视频（完美循环版）
│       └── start-run.mp4      # 点击起跑过渡视频（放一次）
├── PRD.md                     # 产品需求文档
├── arch.md                    # 本技术架构文档
├── project_state.md           # 项目进度与状态追踪文档
├── index.html                 # 全局唯一页面入口
├── style.css                  # 全局样式表
└── script.js                  # 全局核心业务逻辑