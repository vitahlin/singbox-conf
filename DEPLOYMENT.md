# AWS Lambda 部署配置

这个项目使用 GitHub Actions 自动部署到 AWS Lambda。

## 配置步骤

### 1. AWS 凭证配置

在 GitHub 仓库中设置以下 Secrets：

1. 进入你的 GitHub 仓库
2. 点击 `Settings` -> `Secrets and variables` -> `Actions`
3. 添加以下 Repository secrets：

```
AWS_ACCESS_KEY_ID: 你的AWS访问密钥ID
AWS_SECRET_ACCESS_KEY: 你的AWS秘密访问密钥
```

### 2. 修改部署配置

编辑 `.github/workflows/deploy-lambda.yml` 文件中的环境变量：

```yaml
env:
  AWS_REGION: us-east-1  # 修改为你的AWS区域
  LAMBDA_FUNCTION_NAME: singbox-conf-handler  # 修改为你的Lambda函数名
```

### 3. AWS IAM 权限

确保你的 AWS 凭证具有以下权限：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "lambda:UpdateFunctionCode",
                "lambda:GetFunction",
                "lambda:UpdateFunctionConfiguration"
            ],
            "Resource": "arn:aws:lambda:*:*:function:你的函数名"
        }
    ]
}
```

### 4. Lambda 函数要求

确保你的 AWS Lambda 函数：
- 已经存在（GitHub Action 不会创建新函数）
- 运行时设置为 Node.js 18.x 或更高版本
- 处理程序设置为 `index.handler`

## 部署流程

1. **触发条件**：
   - 推送到 `main` 或 `master` 分支
   - 创建针对这些分支的 Pull Request

2. **部署步骤**：
   - 检出代码
   - 设置 Node.js 环境
   - 安装依赖（如果有 package.json）
   - 运行测试（如果有）
   - 创建部署包（zip文件）
   - 上传到 AWS Lambda
   - 验证部署成功

3. **部署包内容**：
   - `index.mjs` - 主要的 Lambda 函数代码
   - `package.json` - 如果存在
   - `node_modules/` - 如果存在

## 监控部署

1. 在 GitHub 仓库的 `Actions` 标签页查看部署状态
2. 部署成功后，可以在 AWS Lambda 控制台验证函数已更新
3. 部署包也会作为 artifact 保存 30 天

## 故障排除

### 常见问题：

1. **权限错误**：检查 AWS 凭证和 IAM 权限
2. **函数不存在**：确保 Lambda 函数已在 AWS 中创建
3. **区域错误**：确保 `AWS_REGION` 与你的 Lambda 函数所在区域一致
4. **函数名错误**：确保 `LAMBDA_FUNCTION_NAME` 与实际函数名一致

### 调试步骤：

1. 查看 GitHub Actions 日志
2. 检查 AWS CloudWatch 日志
3. 在 AWS Lambda 控制台测试函数

## 手动部署

如果需要手动部署，可以运行以下命令：

```bash
# 创建部署包
zip -r lambda-deployment.zip index.mjs package.json node_modules/

# 上传到 Lambda
aws lambda update-function-code \
  --function-name your-function-name \
  --zip-file fileb://lambda-deployment.zip
```
