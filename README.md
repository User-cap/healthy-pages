# 健康记录 · 独立静态版

从空记录开始，不含原站历史记录、图片、身份信息和密钥。

## 运行与发布

无需构建即可发布：将 `index.html`、`style.css`、`favicon.svg`、`assets/`、`data/` 和 `.nojekyll` 放在网站根目录。相对路径支持 GitHub Pages 子目录。

GitHub Pages：仓库 Settings → Pages → Deploy from a branch → main → / (root) → Save。私有仓库能否启用 Pages 取决于账户方案；不要为部署擅自公开旧分支或旧提交里的文件。

也可以把上述静态文件上传其他静态托管服务。没有绑定 Cloudflare，没有 chatgpt.site 依赖。国内网络连通性仍需在实际网络测试。

## 数据

- 使用 IndexedDB 在当前浏览器保存两位对象的记录与原图，不自动上传服务器或 GitHub。
- 新增饮食、体重、当日累计活动；同日累计活动再次保存替换该日一条活动，避免重复计算。
- 体重支持公斤/斤自动换算；数值可以清空。
- 营养与周报仅使用已有记录的规则分析，不冒充 AI。营养素可选；未填表示未知，以0占位不代表真实为零。
- 图片保存原文件内容，不提供自动识别。
- 在“数据”页下载完整备份（含图片），换设备时导入。导入会替换本机两位对象的记录。
- 清理浏览器数据或卸载浏览器会丢失本机数据。请定期下载备份。
- 在聊天中发记录不会自动同步到此网站；需要在网页录入或导入更新后的 JSON。

## 开发

`npm install`，`npm run build`。源码在 src/，浏览器运行文件是 assets/app.js。依赖版本固定在 package.json；第三方许可证在 THIRD-PARTY-NOTICES.txt。
