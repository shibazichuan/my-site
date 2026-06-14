# 个人网站 - 阶段三·第五部分：工具箱扩展 设计文档

> **日期**: 2026-06-14
> **概述**: 新增 4 个前端工具（正则测试器、Diff 对比、Markdown 编辑器、JWT 调试器）

---

## 1. 范围

| 工具 | 路由 | 说明 |
|------|------|------|
| 正则测试器 | `/tools/regex` | 正则输入 + 测试文本 + 实时高亮匹配 + 捕获组展示 |
| Diff 对比 | `/tools/diff` | 左右两栏文本对比，行级增删改高亮 |
| Markdown 编辑器 | `/tools/markdown` | 左侧编辑 + 右侧实时预览 |
| JWT 调试器 | `/tools/jwt` | 粘贴 JWT → 解码 header/payload + 签名验证提示 |

全部纯前端，零后端改动。

---

## 2. 技术

- 正则：原生 `RegExp` + `matchAll` 提取匹配和捕获组
- Diff：简单 LCS 算法或逐行比较
- Markdown：复用已有 `formatContent` 逻辑或 `marked` 库
- JWT：`atob` 解码 base64url + JSON 格式化

---

## 3. 前端文件

```
frontend/src/pages/tools/
├── RegexTester.tsx
├── DiffTool.tsx
├── MarkdownEditor.tsx
└── JwtDebugger.tsx

修改:
├── App.tsx                    # 4 条新路由
└── pages/tools/ToolsIndex.tsx # 4 张新工具卡片
```
