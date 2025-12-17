# 📋 PHASE 4 - TASK 13: CI/CD & MONITORING

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T13 |
| **Tên** | CI/CD & Monitoring |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 12 (AWS) |
| **Task tiếp theo** | Task 14 (E2E Testing) |

---

## 📋 MỤC TIÊU

- GitHub Actions CI/CD
- Auto deploy to staging/production
- CloudWatch monitoring
- Error alerting (Sentry)

---

## PHẦN 1: GITHUB ACTIONS

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-southeast-1
      
      - name: Build & Push Docker
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t laba-erp .
          docker tag laba-erp:latest $ECR_REGISTRY/laba-erp:${{ github.sha }}
          docker push $ECR_REGISTRY/laba-erp:${{ github.sha }}
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster laba-erp --service app --force-new-deployment
```

---

## PHẦN 2: MONITORING

```typescript
// Sentry setup
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

// CloudWatch custom metrics
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

export async function logMetric(name: string, value: number) {
  const cloudwatch = new CloudWatch({});
  await cloudwatch.putMetricData({
    Namespace: 'LABA-ERP',
    MetricData: [{ MetricName: name, Value: value }],
  });
}
```

---

## ✅ CHECKLIST

- [ ] GitHub Actions workflow
- [ ] Docker build
- [ ] ECR push
- [ ] ECS deploy
- [ ] Sentry integration
- [ ] CloudWatch dashboards

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 14 - E2E Testing & UAT
