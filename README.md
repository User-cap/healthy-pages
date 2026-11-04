# 健康记录 · Cloudflare 私有云端版

网站代码在公开 GitHub 仓库中；健康记录和原图只存放在 Cloudflare D1 数据库中。仓库的 `data/health.json` 是空白样例，不包含个人记录。正式网站使用 Cloudflare Access 限制登录，请勿把记录、备份、密钥或数据库导出提交到仓库。

## 部署配置

Cloudflare Pages 项目连接本仓库的 `main` 分支，构建命令留空，输出目录为 `.`。Pages Functions 位于 `functions/api/`，生产环境 D1 绑定变量名必须是 `HEALTH_DB`。首次访问 API 时会自动创建 `health_state` 和 `health_images` 表。正式 `pages.dev` 地址及预览地址应分别受到 Cloudflare Access 保护，允许规则仅包含站点所有者的邮箱。部署前后从未登录的浏览器访问正式地址，应跳转到 Access 登录页。

GitHub Pages 不能运行 Pages Functions，因此旧的 `github.io` 地址不再支持记录；请使用 Cloudflare 的 `pages.dev` 地址。静态代码和空白样例仍可见，不含个人数据。

## 使用与备份

网页支持饮食、活动、体重记录，原图上传和完整 JSON 备份。手机换设备后，登录同一网站即可查看云端数据。导入备份会替换两位对象的云端记录。并发修改时，旧版本的保存会被拒绝，刷新后再操作。

API `GET /api/state` 返回 `{ revision, data }`；`PUT /api/state` 提交同样的结构，只有 `revision` 与云端一致才会写入。图片通过 `PUT /api/image` 单独保存，`GET /api/image?profile=...&id=...` 读取。未来在聊天中代用户更新记录时，应先从受保护的 Cloudflare 数据库读取最新状态，按现有记录格式添加，再以当前版本保存，绝不能提交记录到 GitHub。Cloudflare D1 控制台也可用于只读检查和经校验后的更新。

## 开发

`npm install` 后运行 `npm run build`，生成 `assets/app.js`。修改 `src/` 后提交新的构建文件。Cloudflare Pages 会自动编译 `functions/` 下的 TypeScript。依赖版本固定在 `package.json`，第三方许可证见 `THIRD-PARTY-NOTICES.txt`。
